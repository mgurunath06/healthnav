import { create } from 'zustand'

export const useInvestigationStore = create((set) => ({
  screen: 'input',
  requestId: null,
  symptomDescription: '',
  investigationDepth: 2,
  selectedProfileId: '',
  followUpHistory: [],
  apiResponse: null,
  topicOverview: null,
  error: null,
  investigationStartedAt: null,
  agentTrace: [],
  currentAgent: null,

  setScreen: (screen) => set({ screen }),
  setRequestId: (requestId) => set({ requestId }),
  setInvestigationStartedAt: (ts) => set({ investigationStartedAt: ts }),
  setSymptomDescription: (symptomDescription) => set({ symptomDescription }),
  setInvestigationDepth: (investigationDepth) => set({ investigationDepth }),
  setSelectedProfileId: (selectedProfileId) => set({ selectedProfileId }),
  appendFollowUp: (item) => set((s) => ({ followUpHistory: [...s.followUpHistory, item] })),
  setApiResponse: (apiResponse) => set({ apiResponse }),
  setTopicOverview: (topicOverview) => set({ topicOverview }),
  setError: (error) => set({ error }),
  resetAgentTrace: () => set({ agentTrace: [], currentAgent: null }),
  applyAgentEvent: (event) => set((state) => {
    if (!event.agent) return state
    const status = event.event === 'agent_started'
      ? 'pending'
      : event.event === 'agent_completed' ? 'ok' : 'failed'
    const existing = state.agentTrace.findIndex((item) => item.agent === event.agent)
    const nextItem = {
      agent: event.agent,
      status,
      duration_ms: event.duration_ms ?? null,
    }
    const agentTrace = existing === -1
      ? [...state.agentTrace, nextItem]
      : state.agentTrace.map((item, index) => index === existing ? { ...item, ...nextItem } : item)
    return {
      agentTrace,
      currentAgent: status === 'pending'
        ? event.agent
        : state.currentAgent === event.agent ? null : state.currentAgent,
    }
  }),

  reset: () => set({
    screen: 'input',
    requestId: null,
    symptomDescription: '',
    investigationDepth: 2,
    selectedProfileId: '',
    followUpHistory: [],
    apiResponse: null,
    topicOverview: null,
    error: null,
    investigationStartedAt: null,
    agentTrace: [],
    currentAgent: null,
  }),
}))
