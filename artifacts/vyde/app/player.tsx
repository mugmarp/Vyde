import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Animated, Platform, Linking, Share,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import { LiveComment, fetchYouTubeComments, fetchYouTubeVideo } from '@/api/youtube';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

const { width: W, height: H } = Dimensions.get('window');
const PLAYER_H = Math.round(W * (9 / 16));

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
  const { id, title: routeTitle, channel: routeChannel, thumbnail: routeThumbnail } =
    useLocalSearchParams<{ id: string; title?: string; channel?: string; thumbnail?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { likedVideoIds, savedVideoIds, toggleLike, toggleSave, recordHistory } = useAppContext();
  const videoId = Array.isArray(id) ? id[0] : id;
  const [liveVideo, setLiveVideo] = useState<Awaited<ReturnType<typeof fetchYouTubeVideo>> | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const upNext = liveVideo?.relatedVideos ?? [];

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [seekLeftKey, setSeekLeftKey] = useState(0);
  const [seekRightKey, setSeekRightKey] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [posterVisible, setPosterVisible] = useState(true);
  const isLiked = !!videoId && likedVideoIds.includes(videoId);
  const isSaved = !!videoId && savedVideoIds.includes(videoId);
  const playbackCandidates = (liveVideo?.nativePlaybackCandidates ?? []).filter(candidate => {
    try {
      return new URL(candidate.uri).protocol === 'https:' &&
        (candidate.contentType === 'hls' || candidate.contentType === 'progressive');
    } catch {
      return false;
    }
  });
  const playbackSource = Platform.OS !== 'web' ? playbackCandidates[candidateIndex] ?? null : null;
  const showNativeVideo = Platform.OS !== 'web' && !!playbackSource && !playbackError;
  const nativePlayer = useVideoPlayer(
    playbackSource ? { uri: playbackSource.uri, contentType: playbackSource.contentType } : null,
    player => {
    player.audioMixingMode = 'auto';
    player.staysActiveInBackground = false;
    player.showNowPlayingNotification = false;
    player.timeUpdateEventInterval = 0.25;
    },
  );

  useEffect(() => {
    if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) {
      setPlaybackError('This video link is invalid.');
      return;
    }
    let active = true;
    setLiveVideo(null);
    setComments([]);
    setCommentCount(null);
    setCommentsError(null);
    setCandidateIndex(0);
    setPlaybackError(null);
    setPosterVisible(true);
    fetchYouTubeVideo(videoId)
      .then(details => {
        if (active) setLiveVideo(details);
      })
      .catch(error => {
        if (active) setPlaybackError(error instanceof Error ? error.message : 'Video details could not be loaded.');
      });
    fetchYouTubeComments(videoId)
      .then(result => {
        if (!active) return;
        setComments(result.items);
        setCommentCount(result.commentCount);
      })
      .catch(error => {
        if (active) setCommentsError(error instanceof Error ? error.message : 'Comments could not be loaded.');
      });
    return () => { active = false; };
  }, [videoId]);

  useEffect(() => {
    const statusSubscription = nativePlayer.addListener('statusChange', event => {
      if (event.status === 'error') {
        if (candidateIndex + 1 < playbackCandidates.length) {
          setCandidateIndex(index => index + 1);
          setPlaybackError(null);
          setPosterVisible(true);
        } else {
          setPlaybackError(event.error?.message ?? 'Native playback could not start.');
        }
        setPlaying(false);
      }
    });
    const playingSubscription = nativePlayer.addListener('playingChange', event => {
      setPlaying(event.isPlaying);
    });
    const timeSubscription = nativePlayer.addListener('timeUpdate', event => {
      if (nativePlayer.duration > 0 && Number.isFinite(nativePlayer.duration)) {
        setProgress(Math.max(0, Math.min(1, event.currentTime / nativePlayer.duration)));
      }
    });
    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
      timeSubscription.remove();
    };
  }, [nativePlayer, candidateIndex, playbackCandidates.length]);

  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    setPlaybackError(null);
    setPosterVisible(true);
  }, [playbackSource?.uri]);

  useEffect(() => {
    const title = liveVideo?.title ?? routeTitle;
    if (!videoId || !title) return;
    recordHistory(videoId, {
      title,
      channel: liveVideo?.channel ?? routeChannel ?? '',
      thumbnail: liveVideo?.thumbnail ?? routeThumbnail ?? '',
    }, 0);
  }, [videoId, liveVideo?.title, routeTitle]);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (playingRef.current) setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => { resetControlsTimer(); }, []);

  // Seek bar scrub
  const handleSeekBarPress = (e: any) => {
    if (!showNativeVideo || nativePlayer.duration <= 0) return;
    const x = e.nativeEvent.locationX;
    const barWidth = W;
    const nextProgress = Math.max(0, Math.min(1, x / barWidth));
    if (showNativeVideo && nativePlayer.duration > 0) {
      nativePlayer.currentTime = nextProgress * nativePlayer.duration;
    }
    setProgress(nextProgress);
  };

  const formatTime = (p: number) => {
    const totalSecs = Math.round(p * (showNativeVideo && nativePlayer.duration > 0 ? nativePlayer.duration : 0));
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const seekBy = (seconds: number) => {
    if (showNativeVideo) {
      nativePlayer.seekBy(seconds);
    }
  };

  const togglePlayback = () => {
    if (showNativeVideo) {
      if (nativePlayer.playing) nativePlayer.pause();
      else nativePlayer.play();
      resetControlsTimer();
      return;
    }
    void Linking.openURL(watchUrl);
  };

  const topPad = Platform.OS === 'web' ? 10 : insets.top;
  const displayTitle = liveVideo?.title ?? routeTitle ?? 'Loading video…';
  const displayChannel = liveVideo?.channel ?? routeChannel ?? '';
  const displayDescription = liveVideo?.description ?? '';
  const displayThumbnail = liveVideo?.thumbnail ?? routeThumbnail ?? '';
  const watchUrl = liveVideo?.watchUrl ?? (videoId && /^[\w-]{6,20}$/.test(videoId) ? `https://www.youtube.com/watch?v=${videoId}` : 'https://www.youtube.com');
  const channelInitials = displayChannel.trim().slice(0, 2).toUpperCase() || 'YT';

  return (
    <View style={ps.root}>
      {/* ── Video player area ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={resetControlsTimer}
      >
        <View style={ps.player}>
          {showNativeVideo && (
            <VideoView
              player={nativePlayer}
              style={StyleSheet.absoluteFill}
              nativeControls={false}
              contentFit="contain"
              onFirstFrameRender={() => setPosterVisible(false)}
            />
          )}
          {(!showNativeVideo || posterVisible) && (
            <Image source={displayThumbnail ? { uri: displayThumbnail } : undefined} style={ps.poster} contentFit="cover" />
          )}
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
            </View>
          )}

          {/* Centre play/pause */}
          {showControls && (
            <View style={ps.centreControls}>
              {!showNativeVideo ? (
                <TouchableOpacity
                  style={ps.watchButton}
                  onPress={togglePlayback}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-youtube" size={22} color="#fff" />
                  <Text style={ps.watchButtonText}>
                    {playbackError ? 'Watch on YouTube' : 'Open on YouTube'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
              <TouchableOpacity hitSlop={20} onPress={() => { seekBy(-10); setSeekLeftKey(k => k + 1); }}>
                <Ionicons name="play-back" size={34} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={16} onPress={togglePlayback} style={ps.playBtn}>
                <Ionicons name={playing ? 'pause' : 'play'} size={38} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity hitSlop={20} onPress={() => { seekBy(10); setSeekRightKey(k => k + 1); }}>
                <Ionicons name="play-forward" size={34} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Seek ripples */}
          <SeekRipple side="left"  onAnim={seekLeftKey > 0}  key={`sl-${seekLeftKey}`} />
          <SeekRipple side="right" onAnim={seekRightKey > 0} key={`sr-${seekRightKey}`} />

          {/* Progress bar */}
          {showNativeVideo && <View style={ps.seekArea}>
            <TouchableOpacity onPress={handleSeekBarPress} activeOpacity={1}>
              <View style={ps.seekTrack}>
                <View style={[ps.seekFill, { width: `${Math.round(progress * 100)}%` as any }]} />
                <View style={[ps.seekThumb, { left: `${Math.round(progress * 100)}%` as any }]} />
              </View>
            </TouchableOpacity>
            <View style={ps.timeRow}>
              <Text style={ps.timeText}>{formatTime(progress)}</Text>
              <Text style={ps.timeText}>{liveVideo?.duration ?? '--:--'}</Text>
            </View>
          </View>}
        </View>
      </TouchableOpacity>

      {/* ── Below player ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Video info */}
        <View style={ps.infoBlock}>
          <Text style={ps.videoTitle}>{displayTitle}</Text>
          <View style={ps.channelRow}>
            <View style={[ps.chanAvatar, { backgroundColor: C.accent }]}>
              <Text style={ps.chanAvatarText}>{channelInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ps.chanName}>{displayChannel || 'YouTube'}</Text>
              <Text style={ps.viewCount}>
                {liveVideo?.views ? `${Number(liveVideo.views).toLocaleString()} views · ${liveVideo.livestream ? 'Live' : liveVideo.publishedAt}` : playbackError ?? 'Loading video details…'}
              </Text>
            </View>
            <TouchableOpacity style={ps.subBtn} onPress={() => void Linking.openURL(watchUrl)}>
              <Text style={ps.subBtnText}>Open YouTube</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ps.actions}>
          {[
            { icon: isLiked ? 'heart' : 'heart-outline', label: liveVideo?.likes ? Number(liveVideo.likes).toLocaleString() : 'Like', color: isLiked ? C.accent : C.muted, onPress: () => videoId && toggleLike(videoId) },
            { icon: 'share-social-outline', label: 'Share', color: C.muted, onPress: () => void Share.share({ message: watchUrl }) },
            { icon: isSaved ? 'bookmark' : 'bookmark-outline', label: 'Save', color: isSaved ? C.accent : C.muted, onPress: () => videoId && toggleSave(videoId) },
            { icon: 'cloud-download-outline', label: 'Offline unavailable', color: C.dim, onPress: undefined, disabled: true },
          ].map(action => (
            <TouchableOpacity key={action.label} style={ps.actionBtn} onPress={action.onPress} disabled={action.disabled} activeOpacity={0.7}>
              <View style={ps.actionIconWrap}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={[ps.actionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Description */}
        {displayDescription ? <View style={ps.descBlock}>
          <Text style={ps.descText} numberOfLines={3}>{displayDescription}</Text>
        </View> : null}

        {/* Comments */}
        <View style={ps.section}>
          <Text style={ps.sectionLabel}>Comments{commentCount !== null ? ` · ${commentCount.toLocaleString()}` : ''}</Text>
          {commentsError ? <Text style={ps.commentText}>{commentsError}</Text> : null}
          {!commentsError && comments.length === 0 && <Text style={ps.commentText}>{liveVideo ? 'No comments were returned.' : 'Loading comments…'}</Text>}
          {comments.map(comment => (
            <View key={comment.id} style={ps.comment}>
              {comment.thumbnail ? (
                <Image source={{ uri: comment.thumbnail }} style={ps.commentAvatar} contentFit="cover" />
              ) : (
                <View style={[ps.commentAvatar, { backgroundColor: C.elevated }]}>
                  <Text style={ps.commentAvatarText}>{comment.author.trim().slice(0, 1).toUpperCase() || '?'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={ps.commentUser}>{comment.author}</Text>
                  <Text style={ps.commentTime}>{comment.published}</Text>
                </View>
                <Text style={ps.commentText}>{comment.text}</Text>
                {comment.likes > 0 && <Text style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>{comment.likes.toLocaleString()} likes</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Up Next */}
        <View style={ps.section}>
          <Text style={ps.sectionLabel}>Up Next</Text>
          {upNext.map(v => (
            <TouchableOpacity key={v.id} style={ps.upNextRow} activeOpacity={0.8} onPress={() => router.push({
              pathname: '/player',
              params: { id: v.id, title: v.title, channel: v.channel, thumbnail: v.thumbnail },
            })}>
              <View style={ps.upNextThumb}>
                <Image source={{ uri: v.thumbnail }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <View style={ps.upNextDur}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{v.duration ?? 'Video'}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ps.upNextTitle} numberOfLines={2}>{v.title}</Text>
                <Text style={ps.upNextMeta}>{v.channel}{v.views ? ` · ${v.views} views` : ''}</Text>
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
