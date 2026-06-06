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
  }),
}))
