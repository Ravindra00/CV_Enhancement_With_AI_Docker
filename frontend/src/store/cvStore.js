import create from 'zustand';

export const useCVStore = create((set) => ({
  cvs: [],
  currentCV: null,
  loading: false,
  error: null,

  setCVs: (cvs) => set({ cvs }),
  setCurrentCV: (cv) => set({ currentCV: cv }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addCV: (cv) =>
    set((state) => ({
      cvs: [...state.cvs, cv],
    })),

  updateCV: (id, updatedCV) =>
    set((state) => ({
      cvs: state.cvs.map((cv) => (cv.id === id ? updatedCV : cv)),
      currentCV: state.currentCV?.id === id ? updatedCV : state.currentCV,
    })),

  deleteCV: (id) =>
    set((state) => ({
      cvs: state.cvs.filter((cv) => cv.id !== id),
    })),

  reset: () =>
    set({
      cvs: [],
      currentCV: null,
      loading: false,
      error: null,
    }),
}));
