import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '@clerk/clerk-react'
import { useInvestigationStore } from '../store/useInvestigationStore'
import { autofillProfileFromAnswer } from '../lib/profileAutofill'
import { consumeEventStream } from '../lib/sse'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function useInvestigation() {
  const store = useInvestigationStore()
  const { getToken, isSignedIn } = useAuth()

  async function investigate(symptomDescription, followUpHistory = []) {
    let requestId = store.requestId
    if (!requestId) {
      requestId = uuidv4()
      store.setRequestId(requestId)
      store.setInvestigationStartedAt(Date.now())
    }

    store.setSymptomDescription(symptomDescription)
    store.setScreen('loading')
    store.setError(null)
    store.resetAgentTrace()

    try {
      const token = isSignedIn ? await getToken() : null
      const body = {
        request_id: requestId,
        symptom_description: symptomDescription,
        investigation_depth: isSignedIn ? store.investigationDepth : 2,
        follow_up_history: followUpHistory,
        screening_context: store.apiResponse?.screening_context ?? null,
        profile_id: isSignedIn ? store.selectedProfileId || null : null,
        client_context: {
          local_date: new Date().toLocaleDateString('en-CA'),
          season: seasonForMonth(new Date().getMonth()),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }

      const res = await fetch(`${API_BASE}/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('text/event-stream')) {
        let receivedFinalResult = false
        await consumeEventStream(res, (event) => {
          if (['agent_started', 'agent_completed', 'agent_failed'].includes(event.event)) {
            store.applyAgentEvent(event)
          } else if (event.event === 'final_result') {
            receivedFinalResult = true
            applyResult(event.payload, store)
          } else if (event.event === 'error') {
            throw new Error(event.payload?.message ?? 'Investigation stream failed.')
          }
        })
        if (!receivedFinalResult) {
          throw new Error('The investigation stream ended before returning a result.')
        }
      } else {
        applyResult(await res.json(), store)
      }
    } catch (err) {
      store.setScreen('error')
      store.setError(err.message ?? 'Network error')
    }
  }

  // Called after user answers one question in the wizard.
  // Appends to history and immediately fires the next round.
  function submitAnswer(question, answer, answerIsFreeText = false) {
    const item = {
      question_id:   question.id,
      question_text: question.question,
      question_type: question.type,   // 'yes_no' | 'single_choice' | 'multi_choice' | 'scale'
      answer_is_free_text: answerIsFreeText,
      answer: Array.isArray(answer) ? answer.join(', ') : String(answer),
    }
    if (isSignedIn) {
      void autofillProfileFromAnswer({
        question,
        answer: item.answer,
        selectedProfileId: store.selectedProfileId || null,
        getToken,
      })
    }
    store.appendFollowUp(item)
    const updatedHistory = [...store.followUpHistory, item]
    investigate(store.symptomDescription, updatedHistory)
  }

  return { investigate, submitAnswer, reset: store.reset }
}

function applyResult(data, store) {
  store.setApiResponse(data)
  if (data.agent_trace?.length && useInvestigationStore.getState().agentTrace.length === 0) {
    for (const item of data.agent_trace) {
      if (item.agent && item.status) {
        store.applyAgentEvent({
          event: item.status === 'failed' ? 'agent_failed' : 'agent_completed',
          agent: item.agent,
          duration_ms: item.duration_ms,
        })
      }
    }
  }
  if (data.topic_overview) store.setTopicOverview(data.topic_overview)

  switch (data.status) {
    case 'complete':       store.setScreen('prep_card'); break
    case 'needs_followup': store.setScreen('wizard'); break
    case 'emergency':      store.setScreen('emergency'); break
    case 'redirect':       store.setScreen('redirect'); break
    default:
      store.setScreen('error')
      store.setError(data.message ?? 'Unknown error')
  }
}

function seasonForMonth(month) {
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}
