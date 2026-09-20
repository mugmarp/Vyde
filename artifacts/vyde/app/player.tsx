import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, PanResponder, Animated, Platform, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { VIDEOS, MOCK_COMMENTS } from '@/data/mockData';
import { fetchYouTubeVideo } from '@/api/youtube';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

const { width: W, height: H } = Dimensions.get('window');
const PLAYER_H = Math.round(W * (9 / 16));

// ── Gesture bar overlay ──────────────────────────────────────────────────────
function GestureBar({ side, value, icon, visible }: { side: 'left' | 'right'; value: number; icon: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View style={[gb.wrap, { [side]: 16, opacity }]}>
      <Ionicons name={icon as any} size={16} color="#fff" style={{ marginBottom: 6 }} />
      <View style={gb.track}>
        <View style={[gb.fill, { height: `${Math.round(value * 100)}%` as any }]} />
      </View>
    </Animated.View>
  );
}

const gb = StyleSheet.create({
  wrap: { position: 'absolute', top: '50%', marginTop: -55, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: 10, gap: 0 },
  track: { width: 4, height: 70, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end' },
  fill: { width: '100%', backgroundColor: '#fff', borderRadius: 2 },
});

// ── Seek ripple ───────────────────────────────────────────────────────────────
function SeekRipple({ side, onAnim }: { side: 'left' | 'right'; onAnim: boolean }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (onAnim) {
      scale.setValue(0.6);
      opacity.setValue(0.8);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 20 }),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [onAnim]);

  return (
    <Animated.View style={[rp.wrap, side === 'left' ? { left: W * 0.15 } : { right: W * 0.15 }, { transform: [{ scale }], opacity }]}>
      <Ionicons name={side === 'left' ? 'play-back' : 'play-forward'} size={28} color="#fff" />
      <Text style={rp.label}>{side === 'left' ? '−10s' : '+10s'}</Text>
    </Animated.View>
  );
}

const rp = StyleSheet.create({
  wrap: { position: 'absolute', top: PLAYER_H / 2 - 30, alignItems: 'center', gap: 4 },
  label: { color: '#fff', fontSize: 12, fontFamily: 'Outfit_600SemiBold' },
});

// ── Main player screen ────────────────────────────────────────────────────────
export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { likedVideoIds, savedVideoIds, toggleLike, toggleSave, recordHistory } = useAppContext();
  const { isSignedIn } = useAuth();

  const mockVideo = VIDEOS.find(v => v.id === id);
  const [liveVideo, setLiveVideo] = useState<Awaited<ReturnType<typeof fetchYouTubeVideo>> | null>(null);
  const video = mockVideo ?? VIDEOS[0];
  const isLiveVideo = !mockVideo;
  const upNext = VIDEOS.filter(v => v.id !== video.id).slice(0, 4);

  const [playing, setPlaying] = useState(!isLiveVideo);
  const [progress, setProgress] = useState(0.24);
  const [brightness, setBrightness] = useState(0.7);
  const [volume, setVolume] = useState(0.8);
  const [showBright, setShowBright] = useState(false);
  const [showVol, setShowVol] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [seekLeft, setSeekLeft] = useState(false);
  const [seekRight, setSeekRight] = useState(false);
  const [seekLeftKey, setSeekLeftKey] = useState(0);
  const [seekRightKey, setSeekRightKey] = useState(0);
  const isLiked = likedVideoIds.includes(video.id);
  const isSaved = savedVideoIds.includes(video.id);

  useEffect(() => {
    if (!isLiveVideo || !id) return;
    fetchYouTubeVideo(id).then(setLiveVideo).catch(() => {});
  }, [id, isLiveVideo]);

  useEffect(() => {
    recordHistory(video.id, {
      title: liveVideo?.title ?? video.title,
      channel: liveVideo?.channel ?? video.channel,
      thumbnail: liveVideo?.thumbnail ?? video.thumbnail,
    }, isLiveVideo ? 0 : progress);
  }, [video.id, liveVideo?.title]);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  // Auto-advance progress when playing
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setProgress(p => Math.min(p + 0.001, 1));
    }, 200);
    return () => clearInterval(iv);
  }, [playing]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playingRef.current) setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => { resetControlsTimer(); }, []);

  // PanResponder for brightness/volume gestures
  const panRef = useRef<{ startX: number; startY: number; side: 'left' | 'right' | null }>({
    startX: 0, startY: 0, side: null,
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
    onPanResponderGrant: (e) => {
      panRef.current.startX = e.nativeEvent.locationX;
      panRef.current.startY = e.nativeEvent.locationY;
      panRef.current.side = e.nativeEvent.locationX < W / 2 ? 'left' : 'right';
      if (panRef.current.side === 'left') setShowBright(true);
      else setShowVol(true);
    },
    onPanResponderMove: (_, g) => {
      const delta = -g.dy / PLAYER_H;
      if (panRef.current.side === 'left') {
        setBrightness(b => Math.max(0, Math.min(1, b + delta)));
      } else {
        setVolume(v => Math.max(0, Math.min(1, v + delta)));
      }
    },
    onPanResponderRelease: () => {
      setTimeout(() => { setShowBright(false); setShowVol(false); }, 800);
      panRef.current.side = null;
    },
  });

  // Seek bar scrub
  const handleSeekBarPress = (e: any) => {
    const x = e.nativeEvent.locationX;
    const barWidth = W;
    setProgress(Math.max(0, Math.min(1, x / barWidth)));
  };

  const formatTime = (p: number) => {
    const totalSecs = Math.round(p * 1371); // 22:51 for v1
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const topPad = Platform.OS === 'web' ? 10 : insets.top;
  const displayTitle = liveVideo?.title ?? video.title;
  const displayChannel = liveVideo?.channel ?? video.channel;
  const displayDescription = liveVideo?.description ?? video.description;
  const displayThumbnail = liveVideo?.thumbnail ?? video.thumbnail;
  const watchUrl = liveVideo?.watchUrl ?? `https://www.youtube.com/watch?v=${video.id}`;

  return (
    <View style={ps.root}>
      {/* ── Video player area ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={resetControlsTimer}
        {...panResponder.panHandlers}
      >
        <View style={ps.player}>
          <Image source={displayThumbnail} style={ps.poster} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />

          {/* Top controls */}
          {showControls && (
            <View style={[ps.topBar, { paddingTop: topPad + 6 }]}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={ps.backBtn}>
                <Ionicons name="chevron-down" size={26} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={ps.topTitle} numberOfLines={1}>{displayTitle}</Text>
                <Text style={ps.topChannel}>{displayChannel}</Text>
              </View>
              <TouchableOpacity hitSlop={10} style={ps.iconBtn}>
                <Ionicons name="tv-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={10} style={ps.iconBtn}>
                <Ionicons name="settings-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Centre play/pause */}
          {showControls && (
            <View style={ps.centreControls}>
              {isLiveVideo ? (
                <TouchableOpacity
                  style={ps.watchButton}
                  onPress={() => Linking.openURL(watchUrl)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-youtube" size={22} color="#fff" />
                  <Text style={ps.watchButtonText}>Watch on YouTube</Text>
                </TouchableOpacity>
              ) : (
                <>
              <TouchableOpacity hitSlop={20} onPress={() => { setProgress(p => Math.max(0, p - 0.12)); setSeekLeftKey(k => k + 1); }}>
                <Ionicons name="play-back" size={34} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={16} onPress={() => { setPlaying(p => !p); resetControlsTimer(); }} style={ps.playBtn}>
                <Ionicons name={playing ? 'pause' : 'play'} size={38} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={20} onPress={() => { setProgress(p => Math.min(1, p + 0.12)); setSeekRightKey(k => k + 1); }}>
                <Ionicons name="play-forward" size={34} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Gesture overlays */}
          <GestureBar side="left"  value={brightness} icon="sunny-outline"  visible={showBright} />
          <GestureBar side="right" value={volume}     icon="volume-medium-outline" visible={showVol} />

          {/* Seek ripples */}
          <SeekRipple side="left"  onAnim={seekLeftKey > 0}  key={`sl-${seekLeftKey}`} />
          <SeekRipple side="right" onAnim={seekRightKey > 0} key={`sr-${seekRightKey}`} />

          {/* Progress bar */}
          <View style={ps.seekArea}>
            <TouchableOpacity onPress={handleSeekBarPress} activeOpacity={1}>
              <View style={ps.seekTrack}>
                <View style={[ps.seekFill, { width: `${Math.round(progress * 100)}%` as any }]} />
                <View style={[ps.seekThumb, { left: `${Math.round(progress * 100)}%` as any }]} />
              </View>
            </TouchableOpacity>
            <View style={ps.timeRow}>
              <Text style={ps.timeText}>{formatTime(progress)}</Text>
              <Text style={ps.timeText}>{video.duration}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Below player ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Video info */}
        <View style={ps.infoBlock}>
          <Text style={ps.videoTitle}>{displayTitle}</Text>
          <View style={ps.channelRow}>
            <View style={[ps.chanAvatar, { backgroundColor: video.channelColor }]}>
              <Text style={ps.chanAvatarText}>{video.channelInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ps.chanName}>{displayChannel}</Text>
              <Text style={ps.viewCount}>
                {liveVideo ? `${Number(liveVideo.views).toLocaleString()} views · Live on YouTube` : `${video.views} views · ${video.timestamp}`}
              </Text>
            </View>
            <TouchableOpacity style={ps.subBtn} onPress={() => isLiveVideo ? Linking.openURL(watchUrl) : undefined}>
              <Text style={ps.subBtnText}>{isLiveVideo ? 'Open YouTube' : 'Subscribe'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ps.actions}>
          {[
                { icon: isLiked ? 'heart' : 'heart-outline', label: 'likes' in video ? video.likes : 'Like', color: isLiked ? C.accent : C.muted, onPress: () => toggleLike(video.id) },
            { icon: 'share-social-outline', label: 'Share', color: C.muted, onPress: () => {} },
            { icon: isSaved ? 'bookmark' : 'bookmark-outline', label: 'Save', color: isSaved ? C.accent : C.muted, onPress: () => toggleSave(video.id) },
            { icon: 'cloud-download-outline', label: 'Download', color: C.muted, onPress: () => {} },
            { icon: 'flag-outline', label: 'Report', color: C.dim, onPress: () => {} },
          ].map(action => (
            <TouchableOpacity key={action.label} style={ps.actionBtn} onPress={action.onPress} activeOpacity={0.7}>
              <View style={ps.actionIconWrap}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={[ps.actionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Description */}
        <View style={ps.descBlock}>
          <Text style={ps.descText} numberOfLines={3}>{displayDescription}</Text>
        </View>

        {/* Comments */}
        <View style={ps.section}>
          <Text style={ps.sectionLabel}>Comments  <Text style={{ color: C.dim, fontFamily: 'Outfit_400Regular' }}>{MOCK_COMMENTS.length}K</Text></Text>
          {MOCK_COMMENTS.map(c => (
            <View key={c.id} style={ps.comment}>
              <View style={[ps.commentAvatar, { backgroundColor: c.color }]}>
                <Text style={ps.commentAvatarText}>{c.initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={ps.commentUser}>{c.user}</Text>
                  <Text style={ps.commentTime}>{c.time}</Text>
                </View>
                <Text style={ps.commentText}>{c.text}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="heart-outline" size={14} color={C.dim} />
                    <Text style={{ color: C.dim, fontSize: 12 }}>{c.likes.toLocaleString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={{ color: C.dim, fontSize: 12 }}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Up Next */}
        <View style={ps.section}>
          <Text style={ps.sectionLabel}>Up Next</Text>
          {upNext.map(v => (
            <TouchableOpacity key={v.id} style={ps.upNextRow} activeOpacity={0.8} onPress={() => router.push({ pathname: '/player', params: { id: v.id } })}>
              <View style={ps.upNextThumb}>
                <Image source={v.thumbnail} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <View style={ps.upNextDur}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{v.duration}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ps.upNextTitle} numberOfLines={2}>{v.title}</Text>
                <Text style={ps.upNextMeta}>{v.channel} · {v.views} views</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const ps = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  player: { width: W, height: PLAYER_H, backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  poster: { width: '100%', height: '100%' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8,
  },
  backBtn: { padding: 8 },
  topTitle: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  topChannel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  iconBtn: { padding: 8 },
  centreControls: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 44,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36,
  },
  playBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  watchButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FF0033', borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  watchButtonText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_700Bold' },
  seekArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 0 },
  seekTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.25)', position: 'relative' },
  seekFill: { height: 4, backgroundColor: C.accent, position: 'absolute', left: 0, top: 0 },
  seekThumb: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent,
    position: 'absolute', top: -5, marginLeft: -7,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  timeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Outfit_500Medium' },
  infoBlock: { padding: 14 },
  videoTitle: { color: C.text, fontSize: 16, fontFamily: 'Outfit_700Bold', lineHeight: 22, marginBottom: 12 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chanAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chanAvatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  chanName: { color: C.text, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  viewCount: { color: C.dim, fontSize: 12, marginTop: 1 },
  subBtn: { backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  subBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Outfit_700Bold' },
  actions: { paddingHorizontal: 14, paddingBottom: 14, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  actionBtn: { alignItems: 'center', gap: 6, minWidth: 64 },
  actionIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontFamily: 'Outfit_500Medium' },
  descBlock: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  descText: { color: C.muted, fontSize: 13, lineHeight: 20 },
  section: { paddingHorizontal: 14, paddingTop: 20 },
  sectionLabel: { color: C.text, fontSize: 15, fontFamily: 'Outfit_700Bold', marginBottom: 14 },
  comment: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  commentUser: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  commentTime: { color: C.dim, fontSize: 11 },
  commentText: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  upNextRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  upNextThumb: { width: 140, height: 79, borderRadius: 8, overflow: 'hidden', backgroundColor: '#111', position: 'relative', flexShrink: 0 },
  upNextDur: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },
  upNextTitle: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold', lineHeight: 18 },
  upNextMeta: { color: C.dim, fontSize: 11, marginTop: 4 },
});
