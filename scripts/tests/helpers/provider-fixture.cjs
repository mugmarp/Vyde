const { createLoader, settle } = require('./load-typescript.cjs');

// A small hook host drives the production provider's async initialization and
// subsequent persistence effects. It does not render or simulate native UI.
function providerFixture({ database = {}, failReads = false, databaseReadsFail = false, storedValues = {}, platform = 'android', writeOperation = async () => {}, storageWriteOperation = async () => {}, databaseValues = {} } = {}) {
  const state = [], dependencies = [], effects = [], writes = [], deleted = [], mutations = [];
  let cursor = 0, reads = 0;
  const hooks = {
    createContext: () => ({ Provider: 'provider' }),
    useState: initial => {
      const slot = cursor++;
      if (!(slot in state)) state[slot] = initial;
      return [state[slot], next => { state[slot] = typeof next === 'function' ? next(state[slot]) : next; }];
    },
    useRef: initial => {
      const slot = cursor++;
      if (!(slot in state)) state[slot] = { current: initial };
      return state[slot];
    },
    useEffect: (effect, deps) => {
      const slot = cursor++;
      if (!dependencies[slot] || deps.some((value, i) => !Object.is(value, dependencies[slot][i]))) {
        effects.push(effect); dependencies[slot] = deps;
      }
    },
    useCallback: fn => fn,
    useMemo: fn => fn(),
  };
  const db = {
    getDatabase: async () => database,
    fetchHistory: async () => { if (databaseReadsFail) throw new Error('query failed'); return databaseValues.history ?? []; },
    fetchLikedVideoIds: async () => databaseValues.likes ?? [],
    fetchSavedVideoIds: async () => databaseValues.saves ?? [], fetchAllPlaylists: async () => databaseValues.playlists ?? [],
    fetchAllSubscriptions: async () => databaseValues.subscriptions ?? [],
  };
  for (const method of ['upsertHistory', 'clearAllHistory', 'setVideoLiked', 'setVideoSaved', 'createNewPlaylist', 'removePlaylist', 'addVideoToPlaylistDb', 'removeVideoFromPlaylistDb', 'setSubscription', 'resetAllLocalData']) {
    db[method] = async (...args) => { mutations.push([method, ...args]); await writeOperation(method, args); };
  }
  const { AppProvider } = createLoader({
    react: hooks,
    'react/jsx-runtime': { jsx: (component, props) => ({ component, props }) },
    'react-native': { Platform: { OS: platform } },
    '@react-native-async-storage/async-storage': {
      getItem: async key => { reads++; if (failReads) throw new Error('storage unavailable'); return storedValues[key] ?? null; },
      setItem: async (key, value) => { await storageWriteOperation(key, value); writes.push([key, value]); },
    },
    '@/services/db': db,
    '@/services/auth': { getSavedGoogleUser: async () => null },
    '@/services/download/downloadManager': {
      suggestFileName: (id, type) => `${id}.${type === 'audio' ? 'm4a' : 'mp4'}`,
      deleteDownload: async fileName => { deleted.push(fileName); },
    },
  })('context/AppContext.tsx');
  async function render() {
    cursor = 0;
    const tree = AppProvider({ children: null });
    while (effects.length) effects.shift()();
    await settle();
    return tree.props.value;
  }
  return { render, writes, deleted, mutations, get reads() { return reads; } };
}

module.exports = { providerFixture };
