const { createLoader, deferred, settle } = require("./load-typescript.cjs");

// Execute the real screen and its effects, replacing only React/native boundaries.
function playerFixture(t) {
  const transfers = [],
    records = [],
    alerts = [];
  let active = false;
  const state = [],
    refs = [],
    effects = [],
    pending = [],
    players = [],
    requests = [];
  let sc = 0,
    rc = 0,
    ec = 0,
    dirty = true,
    tree,
    player,
    lastSource;
  const route = { id: "abcdefghijk", title: "Example" };
  const noop = () => {};
  const hooks = {
    useState(initial) {
      const i = sc++;
      if (!(i in state)) state[i] = initial;
      return [
        state[i],
        (value) => {
          const next = typeof value === "function" ? value(state[i]) : value;
          if (!Object.is(next, state[i])) {
            state[i] = next;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      return (refs[rc++] ??= { current: initial });
    },
    useCallback: (fn) => fn,
    useEffect(fn, deps) {
      const i = ec++,
        previous = effects[i];
      if (!previous || deps.some((v, j) => !Object.is(v, previous.deps[j]))) {
        pending.push(() => {
          previous?.cleanup?.();
          effects[i] = { deps, cleanup: fn() };
        });
      }
    },
  };
  const Screen = createLoader({
    react: hooks,
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
      Fragment: "Fragment",
    },
    "react-native": {
      Dimensions: { get: () => ({ width: 720, height: 1640 }) },
      StyleSheet: { create: (x) => x, absoluteFillObject: {} },
      Platform: { OS: "android" },
      Animated: { Value: class {} },
      PanResponder: { create: () => ({ panHandlers: {} }) },
      Alert: { alert: (...args) => alerts.push(args) },
      Linking: { openURL: noop },
      Share: { share: noop },
      TouchableOpacity: "Press",
    },
    "expo-image": { Image: "Image" },
    "expo-linear-gradient": { LinearGradient: "Gradient" },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "expo-router": {
      useLocalSearchParams: () => route,
      useRouter: () => ({ back: noop }),
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
    },
    "@/context/AppContext": {
      useAppContext: () => ({
        likedVideoIds: [],
        savedVideoIds: [],
        history: [],
        playlists: [],
        downloads: [],
        isSubscribed: () => false,
        recordHistory: noop,
        addDownload: (item) => records.push(item),
        updateDownloadProgress: noop,
      }),
    },
    "@/api/youtube": {
      fetchYouTubeVideo: (videoId, purpose) => {
        const d = deferred();
        d.videoId = videoId;
        d.purpose = purpose;
        requests.push(d);
        return d.promise;
      },
      fetchYouTubeComments: async () => ({ items: [], commentCount: 0 }),
    },
    "@/services/download/downloadManager": {
      suggestFileName: (id, ext) => `${id}.${ext}`,
      isActive: () => active,
      start: async (options) => {
        transfers.push(options);
        return {};
      },
    },
    "expo-haptics": { selectionAsync: async () => {} },
    "expo-video": {
      VideoView: "Video",
      useVideoPlayer(source, setup) {
        const key = JSON.stringify(source);
        if (!player || key !== lastSource) {
          if (player) player.released = true;
          lastSource = key;
          const listeners = new Map();
          player = {
            source,
            status: "loading",
            duration: 120,
            currentTime: 0,
            playing: false,
            playCalls: 0,
            addListener(name, fn) {
              if (!listeners.has(name)) listeners.set(name, new Set());
              listeners.get(name).add(fn);
              return { remove: () => listeners.get(name).delete(fn) };
            },
            emit(name, event) {
              if (name === "statusChange") this.status = event.status;
              for (const fn of [...(listeners.get(name) ?? [])]) fn(event);
            },
            play() {
              this.playCalls++;
              this.playing = true;
              this.emit("playingChange", { isPlaying: true });
            },
            pause() {
              this.playing = false;
              this.emit("playingChange", { isPlaying: false });
            },
            seekBy(seconds) {
              this.currentTime += seconds;
            },
          };
          players.push(player);
          setup?.(player);
        }
        return player;
      },
    },
  })("app/player.tsx").default;
  function render() {
    let iterations = 0;
    do {
      dirty = false;
      sc = rc = ec = 0;
      tree = Screen();
      while (pending.length) pending.shift()();
      if (++iterations > 20) throw new Error("Screen did not settle");
    } while (dirty);
    return tree;
  }
  function find(test, node) {
    if (Array.isArray(node)) {
      for (const n of node) {
        const found = find(test, n);
        if (found) return found;
      }
    } else if (node && typeof node === "object") {
      if (test(node)) return node;
      return find(test, node.props?.children);
    }
  }
  async function flush() {
    await settle();
    render();
    await settle();
    render();
  }
  t.after(() => {
    for (const e of effects) e?.cleanup?.();
    for (const r of refs)
      if (typeof r?.current?.hasRef === "function") clearTimeout(r.current);
  });
  render();
  return {
    render,
    flush,
    players,
    transfers,
    records,
    alerts,
    requests,
    setActive(value) {
      active = value;
    },
    beginDownload(format) {
      find(
        (n) => n.type === "Press" && n.props.accessibilityLabel === "Download",
        tree,
      ).props.onPress();
      render();
      const operation = find(
        (n) =>
          n.props?.accessibilityLabel ===
          (format === "audio" ? "Download audio" : "Download MP4"),
        tree,
      ).props.onPress();
      render();
      return operation;
    },
    route,
    find: (test) => find(test, tree),
    get current() {
      return player;
    },
    async resolve(sources) {
      requests.at(-1).resolve({
        id: route.id,
        title: "Example",
        channel: "",
        thumbnail: "",
        nativePlaybackCandidates: sources,
        relatedVideos: [],
      });
      await flush();
    },
    pressPlay() {
      const button = find(
        (n) =>
          n.type === "Press" &&
          n.props.children?.type === "Icon" &&
          ["play", "pause"].includes(n.props.children.props.name) &&
          n.props.children.props.size === 38,
        tree,
      );
      if (!button) throw new Error("Play button not visible");
      button.props.onPress();
      render();
    },
    chooseQuality(label) {
      find(
        (n) => n.props?.accessibilityLabel?.startsWith("Quality:"),
        tree,
      ).props.onPress();
      render();
      find(
        (n) =>
          n.type === "Press" &&
          (n.props.accessibilityLabel === `Select quality ${label}` ||
            n.props.children?.[0]?.props?.children?.[0]?.props?.children ===
              label),
        tree,
      ).props.onPress();
      render();
    },
  };
}
module.exports = { playerFixture };
