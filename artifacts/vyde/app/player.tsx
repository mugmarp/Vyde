import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ActivityIndicator, Alert, Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Animated, Platform, Linking, Share, PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import { LiveComment, fetchYouTubeComments, fetchYouTubeVideo } from '@/api/youtube';
import * as DownloadManager from '@/services/download/downloadManager';
import * as Haptics from 'expo-haptics';

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
  const { id, title: routeTitle, channel: routeChannel, thumbnail: routeThumbnail, localUri: routeLocalUri } =
    useLocalSearchParams<{ id: string; title?: string; channel?: string; thumbnail?: string; localUri?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    likedVideoIds, savedVideoIds, history, playlists, downloads,
    toggleLike, toggleSave, recordHistory, addVideoToPlaylist, removeVideoFromPlaylist,
    addDownload, removeDownload, updateDownloadProgress,
  } = useAppContext();
  const videoId = Array.isArray(id) ? id[0] : id;
  const [liveVideo, setLiveVideo] = useState<Awaited<ReturnType<typeof fetchYouTubeVideo>> | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsRetryKey, setCommentsRetryKey] = useState(0);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsRetryKey, setDetailsRetryKey] = useState(0);
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [playlistFeedback, setPlaylistFeedback] = useState<string | null>(null);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [speedPickerOpen, setSpeedPickerOpen] = useState(false);
  const [qualityPickerOpen, setQualityPickerOpen] = useState(false);
  const [downloadPickerOpen, setDownloadPickerOpen] = useState(false);
  const [brightness, setBrightness] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [contentFit, setContentFit] = useState<'contain' | 'cover'>('contain');
  const [hud, setHud] = useState<{ icon: string; label: string } | null>(null);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHud = (icon: string, label: string) => {
    setHud({ icon, label });
    if (hudTimer.current) clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setHud(null), 1200);
  };
  const upNext = liveVideo?.relatedVideos ?? [];

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [seekLeftKey, setSeekLeftKey] = useState(0);
  const [seekRightKey, setSeekRightKey] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [posterVisible, setPosterVisible] = useState(true);
  const lastProgressSavedAt = useRef(0);
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const initialBrightness = useRef(1.0);
  const initialVolume = useRef(1.0);

  const playerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: (evt) => {
        panStartX.current = evt.nativeEvent.locationX;
        panStartY.current = evt.nativeEvent.locationY;
        initialBrightness.current = brightness;
        initialVolume.current = volume;
      },
      onPanResponderMove: (evt, gestureState) => {
        const deltaY = -gestureState.dy; // swipe up is positive
        const sensitivity = 0.005;

        if (panStartX.current < W * 0.45) {
          // Left side: Vertical Pan -> Brightness
          const nextB = Math.max(0.1, Math.min(1.0, initialBrightness.current + deltaY * sensitivity));
          setBrightness(nextB);
          showHud('sunny-outline', `Brightness: ${Math.round(nextB * 100)}%`);
        } else if (panStartX.current > W * 0.55) {
          // Right side: Vertical Pan -> Volume
          const nextV = Math.max(0.0, Math.min(1.0, initialVolume.current + deltaY * sensitivity));
          setVolume(nextV);
          nativePlayer.volume = nextV;
          showHud(nextV > 0 ? 'volume-high-outline' : 'volume-mute-outline', `Volume: ${Math.round(nextV * 100)}%`);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;
  const lastTapRef = useRef({ time: 0, x: 0 });
  const historyRef = useRef(history);
  historyRef.current = history;
  const isLiked = !!videoId && likedVideoIds.includes(videoId);
  const isSaved = !!videoId && savedVideoIds.includes(videoId);
  const playbackCandidates = (liveVideo?.nativePlaybackCandidates ?? []).filter(candidate => {
    try {
      // Accept HLS, progressive muxed, and adaptive-video (expo-video handles all natively)
      return (
        new URL(candidate.uri).protocol === 'https:' &&
        (
          candidate.contentType === 'hls' ||
          candidate.contentType === 'progressive' ||
          candidate.contentType === 'adaptive-video'
        )
      );
    } catch {
      return false;
    }
  });
  // When opened from Library offline tab, inject the local file:// URI as the top candidate
  const offlineCandidate = routeLocalUri
    ? [{ uri: routeLocalUri, contentType: 'progressive' as const, qualityLabel: 'Offline' }]
    : [];
  const allCandidates = [...offlineCandidate, ...playbackCandidates];
  const playbackSource = allCandidates[candidateIndex] ?? null;
  const showNativeVideo = !!playbackSource && !playbackError;
  const nativePlayer = useVideoPlayer(
    playbackSource ? { uri: playbackSource.uri } : null,
    player => {
    player.audioMixingMode = 'auto';
    player.staysActiveInBackground = false;
    player.showNowPlayingNotification = false;
    player.timeUpdateEventInterval = 0.25;
    },
  );

  useEffect(() => {
    setLiveVideo(null);
    setCandidateIndex(0);
    setPlaybackError(null);
    setPosterVisible(true);
    lastProgressSavedAt.current = 0;
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) {
      setDetailsLoading(false);
      setDetailsError('This video link is invalid.');
      return;
    }
    let active = true;
    setLiveVideo(null);
    setDetailsLoading(true);
    setDetailsError(null);
    fetchYouTubeVideo(videoId)
      .then(details => {
        if (active) setLiveVideo(details);
      })
      .catch(error => {
        if (active) setDetailsError(error instanceof Error ? error.message : 'Video details could not be loaded.');
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });
    return () => { active = false; };
  }, [videoId, detailsRetryKey]);

  useEffect(() => {
    if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) {
      setCommentsLoading(false);
      setCommentsError('This video link is invalid.');
      return;
    }
    let active = true;
    setComments([]);
    setCommentCount(null);
    setCommentsLoading(true);
    setCommentsError(null);
    fetchYouTubeComments(videoId)
      .then(result => {
        if (!active) return;
        setComments(result.items);
        setCommentCount(result.commentCount);
      })
      .catch(error => {
        if (active) setCommentsError(error instanceof Error ? error.message : 'Comments could not be loaded.');
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });
    return () => { active = false; };
  }, [videoId, commentsRetryKey]);

  useEffect(() => {
    const statusSubscription = nativePlayer.addListener('statusChange', event => {
      if (event.status === 'error') {
        if (candidateIndex + 1 < allCandidates.length) {
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
        if (videoId && event.currentTime - lastProgressSavedAt.current >= 10 && liveVideo) {
          lastProgressSavedAt.current = event.currentTime;
          recordHistory(videoId, {
            title: liveVideo.title,
            channel: liveVideo.channel,
            thumbnail: liveVideo.thumbnail,
          }, event.currentTime / nativePlayer.duration);
        }
      }
    });
    return () => {
      statusSubscription.remove();
      playingSubscription.remove();
      timeSubscription.remove();
    };
  }, [nativePlayer, candidateIndex, allCandidates.length, videoId, liveVideo, recordHistory]);

  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    setPlaybackError(null);
    setPosterVisible(true);
  }, [playbackSource?.uri]);

  useEffect(() => {
    const title = liveVideo?.title ?? routeTitle;
    if (!videoId || !title) return;
    const existingProgress = historyRef.current.find(item => item.videoId === videoId)?.progress ?? 0;
    recordHistory(videoId, {
      title,
      channel: liveVideo?.channel ?? routeChannel ?? '',
      thumbnail: liveVideo?.thumbnail ?? routeThumbnail ?? '',
    }, existingProgress);
  }, [videoId, liveVideo?.title, routeTitle, liveVideo?.channel, liveVideo?.thumbnail, routeChannel, routeThumbnail, recordHistory]);

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
  const togglePlaylistMembership = (playlistId: string, playlistName: string, alreadyAdded: boolean) => {
    if (!videoId) return;
    if (alreadyAdded) {
      removeVideoFromPlaylist(playlistId, videoId);
      setPlaylistFeedback(`Removed from ${playlistName}`);
    } else {
      addVideoToPlaylist(playlistId, videoId);
      setPlaylistFeedback(`Added to ${playlistName}`);
    }
  };

  const isDownloaded = !!videoId && downloads.some(d => d.videoId === videoId && d.status === 'completed');

  const handleDownload = () => {
    if (!videoId) return;

    if (isDownloaded) {
      Alert.alert(
        'Offline Media',
        `"${displayTitle}" is stored locally on this device.`,
        [
          { text: 'Delete download', style: 'destructive', onPress: () => removeDownload(videoId) },
          { text: 'Keep', style: 'cancel' },
        ],
      );
      return;
    }

    setDownloadPickerOpen(true);
  };

  const triggerDownload = async (targetFormat: 'mp4' | 'audio') => {
    setDownloadPickerOpen(false);
    if (!videoId) return;

    let candidate = null;
    if (targetFormat === 'audio') {
      candidate =
        liveVideo?.nativePlaybackCandidates?.find(c => c.contentType === 'audio') ||
        playbackCandidates.find(c => c.contentType === 'progressive');
    } else {
      candidate =
        playbackCandidates.find(c => c.contentType === 'progressive') ||
        playbackCandidates.find(c => c.contentType === 'adaptive-video') ||
        playbackCandidates[0];
    }

    if (!candidate?.uri) {
      Alert.alert(
        'No stream available',
        'No downloadable stream was found for this format.',
      );
      return;
    }

    const fileName = DownloadManager.suggestFileName(videoId, targetFormat);

    addDownload({
      videoId,
      title: displayTitle,
      channel: displayChannel,
      thumbnail: displayThumbnail,
      duration: liveVideo?.duration,
      format: targetFormat,
      status: 'queued',
      progress: 0,
      uri: undefined,
      fileSize: candidate.contentLength
        ? `${(parseInt(candidate.contentLength, 10) / (1024 * 1024)).toFixed(1)} MB`
        : undefined,
    });

    try {
      await DownloadManager.start({
        videoId,
        uri: candidate.uri,
        fileName,
        onProgress: (progress) => {
          updateDownloadProgress(videoId, progress, 'downloading');
        },
        onComplete: (localUri) => {
          updateDownloadProgress(videoId, 1, 'completed');
          addDownload({
            videoId,
            title: displayTitle,
            channel: displayChannel,
            thumbnail: displayThumbnail,
            duration: liveVideo?.duration,
            format: targetFormat,
            status: 'completed',
            progress: 1,
            uri: localUri,
            fileSize: candidate.contentLength
              ? `${(parseInt(candidate.contentLength, 10) / (1024 * 1024)).toFixed(1)} MB`
              : undefined,
          });
          Alert.alert(
            'Download complete',
            `"${displayTitle}" (${targetFormat.toUpperCase()}) is now available in your Library.`,
          );
        },
        onError: (err) => {
          updateDownloadProgress(videoId, 0, 'failed');
          Alert.alert('Download failed', err);
        },
      });
    } catch (err) {
      updateDownloadProgress(videoId, 0, 'failed');
      Alert.alert('Download failed', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <View style={ps.root}>
      {/* ── Video player area (Gestures & Touch) ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => {
          const now = Date.now();
          const x = e.nativeEvent.locationX;
          if (now - lastTapRef.current.time < 300) {
            // Double tap detected!
            if (x < W * 0.4) {
              // Left side -> Seek -10s
              seekBy(-10);
              setSeekLeftKey(k => k + 1);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showHud('play-back', '-10s');
            } else if (x > W * 0.6) {
              // Right side -> Seek +10s
              seekBy(10);
              setSeekRightKey(k => k + 1);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              showHud('play-forward', '+10s');
            }
            lastTapRef.current = { time: 0, x: 0 };
          } else {
            lastTapRef.current = { time: now, x };
            resetControlsTimer();
          }
        }}
      >
        <View style={ps.player} {...playerPanResponder.panHandlers}>
          {showNativeVideo && (
            <VideoView
              player={nativePlayer}
              style={StyleSheet.absoluteFill}
              nativeControls={false}
              contentFit={contentFit}
              onFirstFrameRender={() => setPosterVisible(false)}
            />
          )}
          {(!showNativeVideo || posterVisible) && (
            <Image source={displayThumbnail ? { uri: displayThumbnail } : undefined} style={ps.poster} contentFit="cover" />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
          {brightness < 1.0 && (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: 1.0 - brightness }]}
              pointerEvents="none"
            />
          )}

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
              {/* Aspect Ratio Toggle (Contain / Cover) */}
              {showNativeVideo && (
                <TouchableOpacity
                  style={ps.controlPill}
                  onPress={() => {
                    const nextFit = contentFit === 'contain' ? 'cover' : 'contain';
                    setContentFit(nextFit);
                    void Haptics.selectionAsync();
                    showHud(nextFit === 'cover' ? 'expand-outline' : 'contract-outline', nextFit === 'cover' ? 'Fill screen' : 'Fit to screen');
                  }}
                  hitSlop={8}
                  accessibilityLabel={`Aspect ratio: ${contentFit}. Tap to toggle.`}
                >
                  <Ionicons name={contentFit === 'cover' ? 'contract-outline' : 'expand-outline'} size={15} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Playback Speed Button */}
              {showNativeVideo && (
                <TouchableOpacity
                  style={ps.controlPill}
                  onPress={() => setSpeedPickerOpen(true)}
                  hitSlop={8}
                  accessibilityLabel={`Playback speed: ${speed}x`}
                >
                  <Text style={ps.controlPillText}>{speed === 1.0 ? '1×' : `${speed}×`}</Text>
                </TouchableOpacity>
              )}

              {/* Stream Quality Picker Button */}
              {playbackSource && (
                <TouchableOpacity
                  style={ps.qualityBadge}
                  onPress={() => setQualityPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Quality: ${playbackSource.qualityLabel}. Tap to change.`}
                >
                  <Text style={ps.qualityBadgeText}>{playbackSource.qualityLabel}</Text>
                </TouchableOpacity>
              )}
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
                    {/* HUD Overlay for Gestures & Adjustments */}
          {hud && (
            <View style={ps.hudContainer}>
              <View style={ps.hudPill}>
                <Ionicons name={hud.icon as any} size={22} color="#fff" />
                <Text style={ps.hudText}>{hud.label}</Text>
              </View>
            </View>
          )}
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
                {liveVideo
                  ? `${Number(liveVideo.views).toLocaleString()} views · ${liveVideo.livestream ? 'Live' : liveVideo.publishedAt}`
                  : detailsLoading ? 'Loading video details…' : detailsError ?? 'Video details unavailable'}
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
            { icon: 'list-outline', label: 'Playlist', color: C.muted, onPress: () => { setPlaylistFeedback(null); setPlaylistPickerOpen(true); } },
            { icon: isDownloaded ? 'checkmark-circle' : 'cloud-download-outline', label: isDownloaded ? 'Downloaded' : 'Download', color: isDownloaded ? C.accent : C.muted, onPress: handleDownload, disabled: false },
          ].map(action => (
            <TouchableOpacity key={action.label} style={ps.actionBtn} onPress={action.onPress} disabled={action.disabled} activeOpacity={0.7}>
              <View style={ps.actionIconWrap}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={[ps.actionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {detailsError && (
          <View style={ps.retryPanel}>
            <Text style={ps.commentText}>{detailsError}</Text>
            <TouchableOpacity
              onPress={() => setDetailsRetryKey(key => key + 1)}
              style={ps.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Retry loading video details"
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={ps.retryButtonText}>Retry details</Text>
            </TouchableOpacity>
          </View>
        )}
        {playbackError && <Text style={[ps.commentText, { paddingHorizontal: 14, paddingVertical: 8 }]}>{playbackError}</Text>}

        {/* Description */}
        {displayDescription ? <View style={ps.descBlock}>
          <Text style={ps.descText} numberOfLines={3}>{displayDescription}</Text>
        </View> : null}

        {/* Comments */}
        <View style={ps.section}>
          <Text style={ps.sectionLabel}>Comments{commentCount !== null ? ` · ${commentCount.toLocaleString()}` : ''}</Text>
          {commentsError ? (
            <View style={ps.retryPanel}>
              <Text style={ps.commentText}>{commentsError}</Text>
              <TouchableOpacity
                onPress={() => setCommentsRetryKey(key => key + 1)}
                style={ps.retryButton}
                accessibilityRole="button"
                accessibilityLabel="Retry loading comments"
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={ps.retryButtonText}>Retry comments</Text>
              </TouchableOpacity>
            </View>
          ) : commentsLoading ? (
            <View style={ps.commentsLoading}>
              <ActivityIndicator color={C.accent} />
              <Text style={ps.commentText}>Loading comments…</Text>
            </View>
          ) : comments.length === 0 ? (
            <Text style={ps.commentText}>No comments were returned.</Text>
          ) : null}
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

                  {/* ── Download Format Choice Modal ── */}
      <Modal
        visible={downloadPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDownloadPickerOpen(false)}
      >
        <View style={ps.modalBackdrop}>
          <View style={[ps.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={ps.modalHeading}>
              <Text style={ps.modalTitle}>Download Media</Text>
              <TouchableOpacity onPress={() => setDownloadPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10, paddingVertical: 8 }}>
              <TouchableOpacity
                style={ps.downloadOption}
                onPress={() => triggerDownload('mp4')}
              >
                <View style={[ps.downloadOptionIcon, { backgroundColor: 'rgba(232, 74, 39, 0.15)' }]}>
                  <Ionicons name="videocam" size={22} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ps.downloadOptionTitle}>Video + Audio (MP4)</Text>
                  <Text style={ps.downloadOptionSub}>Optimal for offline video playback</Text>
                </View>
                <Ionicons name="cloud-download-outline" size={20} color={C.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={ps.downloadOption}
                onPress={() => triggerDownload('audio')}
              >
                <View style={[ps.downloadOptionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                  <Ionicons name="musical-notes" size={22} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ps.downloadOptionTitle}>Audio Only (M4A / AAC)</Text>
                  <Text style={ps.downloadOptionSub}>Save space & listen in the background</Text>
                </View>
                <Ionicons name="cloud-download-outline" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Speed Selector Modal ── */}
      <Modal
        visible={speedPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSpeedPickerOpen(false)}
      >
        <View style={ps.modalBackdrop}>
          <View style={[ps.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={ps.modalHeading}>
              <Text style={ps.modalTitle}>Playback Speed</Text>
              <TouchableOpacity onPress={() => setSpeedPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            <View style={ps.speedGrid}>
              {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[ps.speedOption, speed === s && ps.speedOptionActive]}
                  onPress={() => {
                    nativePlayer.playbackRate = s;
                    setSpeed(s);
                    setSpeedPickerOpen(false);
                    void Haptics.selectionAsync();
                    showHud('speedometer-outline', `${s}× Speed`);
                  }}
                >
                  <Text style={[ps.speedOptionText, speed === s && ps.speedOptionTextActive]}>
                    {s === 1.0 ? 'Normal (1×)' : `${s}×`}
                  </Text>
                  {speed === s && <Ionicons name="checkmark" size={18} color={C.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Quality Selector Modal ── */}
      <Modal
        visible={qualityPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setQualityPickerOpen(false)}
      >
        <View style={ps.modalBackdrop}>
          <View style={[ps.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={ps.modalHeading}>
              <Text style={ps.modalTitle}>Stream Quality</Text>
              <TouchableOpacity onPress={() => setQualityPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {allCandidates.map((candidate, idx) => {
                const isSelected = candidateIndex === idx;
                return (
                  <TouchableOpacity
                    key={`${candidate.uri}-${idx}`}
                    style={[ps.qualityOption, isSelected && ps.qualityOptionActive]}
                    onPress={() => {
                      setCandidateIndex(idx);
                      setQualityPickerOpen(false);
                      void Haptics.selectionAsync();
                      showHud('film-outline', candidate.qualityLabel);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[ps.qualityOptionTitle, isSelected && { color: C.accent }]}>
                        {candidate.qualityLabel}
                      </Text>
                      <Text style={ps.qualityOptionSubtitle}>
                        {candidate.contentType.toUpperCase()} {candidate.height ? `· ${candidate.height}p` : ''}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={playlistPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPlaylistPickerOpen(false)}
      >
        <View style={ps.modalBackdrop}>
          <View style={[ps.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={ps.modalHeading}>
              <Text style={ps.modalTitle}>Add to playlist</Text>
              <TouchableOpacity
                onPress={() => setPlaylistPickerOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close playlist picker"
              >
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            {playlistFeedback && <Text style={ps.playlistFeedback}>{playlistFeedback}</Text>}
            {playlists.length === 0 ? (
              <View style={ps.noPlaylists}>
                <Text style={ps.commentText}>Create a local playlist to organize this video.</Text>
                <TouchableOpacity
                  style={ps.retryButton}
                  onPress={() => {
                    setPlaylistPickerOpen(false);
                    router.push({ pathname: '/(tabs)/library', params: { tab: 'playlists' } });
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={ps.retryButtonText}>Open playlists</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={ps.playlistList} keyboardShouldPersistTaps="handled">
                {playlists.map(playlist => {
                  const alreadyAdded = playlist.videoIds.includes(videoId ?? '');
                  return (
                    <TouchableOpacity
                      key={playlist.id}
                      style={ps.playlistOption}
                      onPress={() => togglePlaylistMembership(playlist.id, playlist.name, alreadyAdded)}
                      accessibilityRole="button"
                      accessibilityLabel={`${alreadyAdded ? 'Remove from' : 'Add to'} ${playlist.name}`}
                    >
                      <View style={ps.playlistOptionIcon}>
                        <Ionicons name="lock-closed" size={18} color={C.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ps.playlistOptionName}>{playlist.name}</Text>
                        <Text style={ps.playlistOptionMeta}>{playlist.videoIds.length} videos</Text>
                      </View>
                      <Ionicons
                        name={alreadyAdded ? 'checkmark-circle' : 'add-circle-outline'}
                        size={22}
                        color={alreadyAdded ? C.accent : C.muted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  downloadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.bg,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  downloadOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadOptionTitle: {
    color: C.text,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  downloadOptionSub: {
    color: C.dim,
    fontSize: 12,
    marginTop: 2,
  },
  controlPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlPillText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  hudContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  hudPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hudText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  speedGrid: {
    paddingVertical: 6,
    gap: 4,
  },
  speedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  speedOptionActive: {
    backgroundColor: 'rgba(232, 74, 39, 0.15)',
  },
  speedOptionText: {
    color: C.text,
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  speedOptionTextActive: {
    color: C.accent,
    fontFamily: 'Outfit_700Bold',
  },
  qualityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  qualityOptionActive: {
    backgroundColor: 'rgba(232, 74, 39, 0.12)',
  },
  qualityOptionTitle: {
    color: C.text,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  qualityOptionSubtitle: {
    color: C.dim,
    fontSize: 11,
    marginTop: 2,
  },
  qualityBadge: {
    backgroundColor: 'rgba(232, 74, 39, 0.25)',
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  qualityBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
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
  retryPanel: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  retryButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, backgroundColor: C.accent, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  retryButtonText: { color: '#fff', fontSize: 12, fontFamily: 'Outfit_700Bold' },
  commentsLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  section: { paddingHorizontal: 14, paddingTop: 20 },
  sectionLabel: { color: C.text, fontSize: 15, fontFamily: 'Outfit_700Bold', marginBottom: 14 },
  comment: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  commentUser: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  commentTime: { color: C.dim, fontSize: 11 },
  commentText: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  modalCard: { maxHeight: '75%', backgroundColor: C.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: C.borderLight, paddingHorizontal: 18, paddingTop: 18, gap: 14 },
  modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: C.text, fontSize: 18, fontFamily: 'Outfit_700Bold' },
  playlistFeedback: { color: C.accent, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  noPlaylists: { alignItems: 'flex-start', gap: 14, paddingVertical: 14 },
  playlistList: { flexGrow: 0 },
  playlistOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  playlistOptionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  playlistOptionName: { color: C.text, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  playlistOptionMeta: { color: C.dim, fontSize: 11, marginTop: 3 },
  upNextRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  upNextThumb: { width: 140, height: 79, borderRadius: 8, overflow: 'hidden', backgroundColor: '#111', position: 'relative', flexShrink: 0 },
  upNextDur: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },
  upNextTitle: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold', lineHeight: 18 },
  upNextMeta: { color: C.dim, fontSize: 11, marginTop: 4 },
});
