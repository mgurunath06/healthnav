export const selfProfile = {
  id: 'profile-self',
  display_name: 'Test User',
  relation: 'self',
  date_of_birth: null,
  sex: null,
  aliases: [],
  notes: null,
}

export const completeProfile = {
  ...selfProfile,
  date_of_birth: '1990-06-07',
  sex: 'male',
}

export const completeCard = {
  status: 'complete',
  request_id: 'request-test',
  doctor_prep_card: {
    investigation_depth: 2,
    summary: 'A recurring headache should be discussed with a licensed clinician.',
    symptom_timeline: {
      primary_symptom: 'Headache',
      duration: 'Two days',
      severity: 'moderate',
      frequency: 'Intermittent',
    },
    key_findings: ['Headache for two days', 'No emergency warning signs reported'],
    lifestyle_context: null,
    questions_to_ask_doctor: ['Could sleep or screen use be contributing?'],
    potentially_relevant_specialties: ['General medicine'],
    recommended_next_step: 'Schedule a medical consultation.',
    quadrant: {
      urgency_score: 3,
      importance_score: 5,
      quadrant_id: 'Q4',
      quadrant_label: 'Monitor',
      urgency_axis_label: 'Low Urgency',
      importance_axis_label: 'Moderate Importance',
      recommended_action: 'Note this for your next routine doctor visit.',
    },
    disclaimer: 'This is a preparation tool, not a diagnosis. The information here should be reviewed with a licensed medical professional. Do not delay seeking care based on this output.',
  },
  agent_trace: [],
}

export async function mockApi(page, { profile = selfProfile, investigate } = {}) {
  await page.route('http://localhost:8000/profiles', async (route) => {
    await route.fulfill({ json: [profile] })
  })
  await page.route('http://localhost:8000/profiles/*', async (route) => {
    const body = route.request().postDataJSON?.() ?? {}
    await route.fulfill({ json: { ...profile, ...body } })
  })
  await page.route('http://localhost:8000/cards', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('http://localhost:8000/documents', async (route) => {
    await route.fulfill({ json: { uploads: [], total: 0 } })
  })
  await page.route('http://localhost:8000/investigate', async (route) => {
    const payload = typeof investigate === 'function'
      ? investigate(route.request())
      : investigate ?? completeCard
    await route.fulfill({ json: payload })
  })
}

export async function seedAuth(page, { remembered = true, promptSeen = false } = {}) {
  await page.addInitScript(({ rememberedValue, promptSeenValue }) => {
    localStorage.setItem('healthnav:test-authenticated', 'true')
    localStorage.setItem('healthnav:remain_logged_in', String(rememberedValue))
    if (promptSeenValue) {
      localStorage.setItem('healthnav:profile-prompt-seen:user_test_healthnav', 'true')
    }
  }, { rememberedValue: remembered, promptSeenValue: promptSeen })
}
