import { create } from 'zustand'

export const useInvestigationStore = create((set) => ({
  screen: 'input',
  requestId: null,
  symptomDescription: '',
  followUpHistory: [],
  apiResponse: null,
  topicOverview: null,   // cached from first deep-dive response, shown in right panel
  error: null,

  setScreen: (screen) => set({ screen }),
  setRequestId: (requestId) => set({ requestId }),
  setSymptomDescription: (symptomDescription) => set({ symptomDescription }),
  appendFollowUp: (item) => set((s) => ({ followUpHistory: [...s.followUpHistory, item] })),
  setApiResponse: (apiResponse) => set({ apiResponse }),
  setTopicOverview: (topicOverview) => set({ topicOverview }),
  setError: (error) => set({ error }),

  reset: () => set({
    screen: 'input',
    requestId: null,
    symptomDescription: '',
    followUpHistory: [],
    apiResponse: null,
    topicOverview: null,
    error: null,
  }),
}))
