// Static fixture data for the /design-preview route.
// None of this touches Clerk, apiFetch, or the live backend — it is pure sample
// data used to render the design of each screen in isolation.

export const previewUser = {
  firstName: 'Aanya',
  lastName: 'Sharma',
}

export const previewProfiles = [
  {
    id: 1,
    display_name: 'Aanya Sharma',
    relation: 'self',
    age: 34,
    sex: 'Female',
    date_of_birth: '12 Mar 1991',
    aliases: [],
    notes: 'Generally well. Tracking iron levels after a low ferritin result last spring.',
    document_count: 4,
    card_count: 3,
    conversation_count: 5,
  },
  {
    id: 2,
    display_name: 'Vikram Sharma',
    relation: 'husband',
    age: 37,
    sex: 'Male',
    date_of_birth: '02 Aug 1988',
    aliases: ['Vik'],
    notes: 'Borderline blood pressure, reviewing every six months.',
    document_count: 2,
    card_count: 1,
    conversation_count: 2,
  },
  {
    id: 3,
    display_name: 'Meera Sharma',
    relation: 'mother',
    age: 63,
    sex: 'Female',
    date_of_birth: '19 Jan 1963',
    aliases: [],
    notes: 'Type 2 diabetes, well controlled. Annual eye and foot checks.',
    document_count: 6,
    card_count: 4,
    conversation_count: 3,
  },
  {
    id: 4,
    display_name: 'Arjun Sharma',
    relation: 'son',
    age: 7,
    sex: 'Male',
    date_of_birth: '05 Sep 2018',
    aliases: [],
    notes: 'Mild seasonal asthma. Inhaler as needed.',
    document_count: 1,
    card_count: 0,
    conversation_count: 1,
  },
]

export const previewCards = [
  {
    card_id: 'card-1',
    summary: 'Recurring evening headaches with mild light sensitivity over the past three weeks.',
    symptom_description: 'Headaches in the evening',
    quadrant: { quadrant_label: 'Schedule Soon' },
    created_at: '2026-05-29T18:00:00Z',
  },
  {
    card_id: 'card-2',
    summary: 'Persistent fatigue and shortness of breath on stairs, alongside low ferritin history.',
    symptom_description: 'Fatigue',
    quadrant: { quadrant_label: 'Watch & Self-Care' },
    created_at: '2026-05-21T09:30:00Z',
  },
  {
    card_id: 'card-3',
    summary: 'Intermittent right-knee discomfort after running, no swelling.',
    symptom_description: 'Knee pain',
    quadrant: { quadrant_label: 'Monitor' },
    created_at: '2026-05-12T14:15:00Z',
  },
]

export const previewDocuments = [
  { upload_id: 'doc-1', original_filename: 'Complete Blood Count — May 2026.pdf', values_extracted: 18, findings_extracted: 3 },
  { upload_id: 'doc-2', original_filename: 'Thyroid Panel — Apr 2026.pdf', values_extracted: 5, findings_extracted: 1 },
  { upload_id: 'doc-3', original_filename: 'Chest X-Ray Report.pdf', values_extracted: 0, findings_extracted: 2 },
]

export const previewProfileOverview = {
  profile: previewProfiles[0],
  memory: {
    summary:
      'Aanya is a generally healthy 34-year-old. A low ferritin result last spring is being followed with iron supplementation, and recent bloodwork shows haemoglobin trending back toward normal. No chronic conditions on record.',
  },
  documents: [
    { upload_id: 'doc-1', title: 'Complete Blood Count', document_type: 'Blood test', date: '29 May 2026' },
    { upload_id: 'doc-2', title: 'Thyroid Panel', document_type: 'Blood test', date: '14 Apr 2026' },
  ],
  cards: [
    { card_id: 'card-1', title: 'Recurring evening headaches', date: '29 May 2026' },
    { card_id: 'card-2', title: 'Persistent fatigue review', date: '21 May 2026' },
  ],
}

export const previewPrepCard = {
  investigation_depth: 4,
  summary:
    'Three weeks of recurring evening headaches, typically dull and behind the eyes, with mild sensitivity to bright light. No fever, no visual aura, no weakness. Symptoms ease after rest and hydration.',
  symptom_timeline: {
    primary_symptom: 'Evening headache',
    duration: '3 weeks',
    severity: 'moderate',
    frequency: '4–5 evenings per week',
  },
  suspected_cause:
    'Pattern is most consistent with tension-type or screen-related headache, possibly compounded by dehydration. Worth confirming with your doctor.',
  key_findings: [
    'Headaches concentrated in the evening, after extended screen work.',
    'Mild photosensitivity but no aura or nausea.',
    'Improves with rest, water, and reduced screen time.',
  ],
  lifestyle_context:
    'Long workdays at a screen, variable water intake, and later-than-usual sleep over the past month.',
  questions_to_ask_doctor: [
    'Could my screen routine or hydration be driving these headaches?',
    'Are there warning signs that would mean I should seek care sooner?',
    'Would any simple bloodwork be sensible given my low ferritin history?',
  ],
  potentially_relevant_specialties: ['General Practice', 'Neurology', 'Optometry'],
  recommended_next_step:
    'Book a routine appointment with your GP within the next 1–2 weeks. Bring this card and a short diary of when the headaches occur.',
  quadrant: {
    quadrant_id: 'Q2',
    quadrant_label: 'Schedule Soon',
    recommended_action: 'Routine appointment within 1–2 weeks',
  },
  disclaimer:
    'HealthNav organizes information for a medical conversation. It does not diagnose or replace professional care. If symptoms worsen suddenly or you develop new neurological signs, seek urgent care.',
}

export const previewConversations = [
  { conversation_id: 'c1', title: 'Iron levels and fatigue', updated_at: '2026-05-30T10:00:00Z' },
  { conversation_id: 'c2', title: 'Preparing for GP visit', updated_at: '2026-05-28T16:20:00Z' },
  { conversation_id: 'c3', title: "Mum's diabetes review", updated_at: '2026-05-20T08:45:00Z' },
]

export const previewMessages = [
  {
    role: 'user',
    content: "I've been feeling tired lately and I had low ferritin last year. What should I keep an eye on?",
    disclaimer_shown: false,
  },
  {
    role: 'assistant',
    content:
      'Given your history of low ferritin, fatigue is worth tracking carefully. It can help to note when the tiredness is worst, whether it improves with rest, and any other symptoms like breathlessness on stairs or unusual paleness. Your recent blood count shows haemoglobin trending back toward normal, which is reassuring. It would be reasonable to mention the ongoing fatigue at your next routine appointment and ask whether repeating iron studies makes sense.',
    disclaimer_shown: true,
  },
]

export const previewUploadResult = {
  status: 'complete',
  _filename: 'Complete Blood Count — May 2026.pdf',
  assigned_profile_id: null,
  document_meta: {
    document_date: '29 May 2026',
    hospital_or_lab: 'Meridian Diagnostics Lab',
    patient_name: 'Aanya Sharma',
    patient_age: '34',
    patient_sex: 'Female',
    reporting_doctor: 'Dr. R. Nair',
  },
  processing_note: 'File processed in memory and discarded immediately after extraction.',
  conclusions: [
    'Haemoglobin within normal range, improved from prior result.',
    'Ferritin remains at the low end of normal.',
  ],
  findings: [
    { section: 'Haematology', finding: 'Haemoglobin 12.9 g/dL — within normal range.', is_abnormal: false },
    { section: 'Iron studies', finding: 'Ferritin 18 ng/mL — low-normal, continue monitoring.', is_abnormal: true },
  ],
  numeric_values: [
    { name: 'Haemoglobin', value: '12.9', unit: 'g/dL', reference_range: '12.0–15.5', is_abnormal: false },
    { name: 'Ferritin', value: '18', unit: 'ng/mL', reference_range: '15–150', is_abnormal: true },
    { name: 'White Cell Count', value: '6.4', unit: '10⁹/L', reference_range: '4.0–11.0', is_abnormal: false },
    { name: 'Platelets', value: '268', unit: '10⁹/L', reference_range: '150–400', is_abnormal: false },
  ],
  conditions_mentioned: ['Iron-deficiency history'],
}
