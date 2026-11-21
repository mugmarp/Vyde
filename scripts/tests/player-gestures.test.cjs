const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./helpers/load-typescript.cjs");

// The screen is real; React/native rendering and source-dependent player
// replacement are boundary fixtures. Effects/network are deliberately not run.
function fixture(t) {
  const state = [],
    refs = [];
  let stateCursor = 0,
    refCursor = 0;
  const hooks = {
    useState: (initial) => {
      const i = stateCursor++;
      if (!(i in state)) state[i] = initial;
      return [
        state[i],
        (next) =>
          (state[i] = typeof next === "function" ? next(state[i]) : next),
      ];
    },
    useRef: (initial) => {
      const i = refCursor++;
      return (refs[i] ??= { current: initial });
    },
    useEffect: () => {},
    useCallback: (fn) => fn,
  };
  let lastSource, player, gesture;
  const players = [];
  const noop = () => {};
  const context = {
    likedVideoIds: [],
    savedVideoIds: [],
    history: [],
    playlists: [],
    downloads: [],
    isSubscribed: () => false,
  };
  const Screen = createLoader({
    react: hooks,
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    "react-native": {
      Dimensions: { get: () => ({ width: 720, height: 1640 }) },
      StyleSheet: { create: (x) => x, absoluteFillObject: {} },
      Platform: { OS: "android" },
      Animated: { Value: class {} },
      PanResponder: {
        create: (config) => {
          gesture ??= config;
          return { panHandlers: {} };
        },
      },
      Alert: { alert: noop },
      Linking: { openURL: noop },
      Share: { share: noop },
    },
    "expo-image": { Image: "Image" },
    "expo-linear-gradient": { LinearGradient: "Gradient" },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "expo-router": {
      useLocalSearchParams: () => ({ id: "abcdefghijk", title: "Example" }),
      useRouter: () => ({ back: noop }),
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
    },
    "@/context/AppContext": { useAppContext: () => context },
    "@/api/youtube": {},
    "@/services/download/downloadManager": {},
    "expo-haptics": {},
    "expo-video": {
      VideoView: "Video",
      useVideoPlayer: (source, setup) => {
        const key = JSON.stringify(source);
        if (!player || key !== lastSource) {
          lastSource = key;
          player = {
            id: players.length + 1,
            volume: 1,
            duration: 0,
            playing: false,
          };
          players.push(player);
          setup?.(player);
        }
        return player;
      },
    },
  })("app/player.tsx").default;
  const render = () => {
    stateCursor = refCursor = 0;
    Screen();
  };
  const resolve = (uri) => {
    state[0] = {
      id: "abcdefghijk",
      title: "Example",
      nativePlaybackCandidates: [
        { uri, contentType: "progressive", qualityLabel: "360p" },
      ],
      relatedVideos: [],
    };
    render();
  };
  t.after(() => {
    for (const ref of refs)
      if (typeof ref.current?.hasRef === "function") clearTimeout(ref.current);
  });
  return {
    render,
    resolve,
    players,
    get current() {
      return player;
    },
    swipe: (dy) => {
      gesture.onPanResponderGrant({
        nativeEvent: { locationX: 700, locationY: 100 },
      });
      gesture.onPanResponderMove({}, { dy });
    },
  };
}

test("volume gesture addresses the current source player instead of the first instance", (t) => {
  const f = fixture(t);
  f.render();
  f.resolve("https://example.com/first.mp4");
  f.swipe(100);
  assert.equal(f.players[0].volume, 1);
  assert.equal(f.current.volume, 0.5);
});

test("later gestures use the latest volume and replacement players inherit volume and speed", (t) => {
  const f = fixture(t);
  f.render();
  f.resolve("https://example.com/first.mp4");
  f.swipe(100);
  f.render();
  f.swipe(20);
  assert.equal(f.current.volume, 0.4);
  f.render();
  f.resolve("https://example.com/second.mp4");
  assert.equal(f.current.volume, 0.4);
  assert.equal(f.current.playbackRate, 1);
});
