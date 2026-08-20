import React, { useState } from 'react';
import {
  View, Text, FlatList, ScrollView,
  TouchableOpacity, StyleSheet, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import VideoCard from '@/components/VideoCard';
import { VIDEOS, CATEGORIES, CONTINUE_WATCHING, CHANNELS } from '@/data/mockData';
import { LiveVideo, fetchLiveFeed } from '@/api/youtube';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

// ── Continue Watching card ──────────────────────────────────────────────────
function ContinueCard({ videoId, progress }: { videoId: string; progress: number }) {
  const video = VIDEOS.find(v => v.id === videoId);
  const router = useRouter();
  if (!video) return null;
  return (
    <TouchableOpacity
      style={cw.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/player', params: { id: video.id } })}
    >
      <View style={cw.thumbWrap}>
        <Image source={video.thumbnail} style={cw.thumb} contentFit="cover" />
        <View style={cw.overlay} />
        <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.9)" style={cw.playIcon} />
        <View style={cw.track}>
          <View style={[cw.fill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>
      <Text style={cw.title} numberOfLines={2}>{video.title}</Text>
      <Text style={cw.meta}>{video.channel} · {Math.round(progress * 100)}% watched</Text>
    </TouchableOpacity>
  );
}

const cw = StyleSheet.create({
  card: { width: 200, marginRight: 12 },
  thumbWrap: { width: 200, height: 112, borderRadius: 10, overflow: 'hidden', position: 'relative', backgroundColor: '#111' },
  thumb: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  playIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -16, marginLeft: -16 },
  track: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  fill: { height: 3, backgroundColor: C.accent },
  title: { color: C.text, fontSize: 13, fontWeight: '600', fontFamily: 'Outfit_600SemiBold', marginTop: 8, lineHeight: 18 },
  meta: { color: C.dim, fontSize: 11, marginTop: 3 },
});

// ── Subscription shelf ──────────────────────────────────────────────────────
function SubscriptionShelf() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 4, gap: 20 }}>
      {CHANNELS.map(ch => (
        <View key={ch.id} style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: ch.color, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.accent }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{ch.initials}</Text>
          </View>
          <Text style={{ color: C.muted, fontSize: 11, maxWidth: 52 }} numberOfLines={1}>{ch.name.split(' ')[0]}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isSignedIn, user } = useAuth();
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState('All');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [liveVideos, setLiveVideos] = useState<LiveVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLiveFeed();
      setLiveVideos(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load YouTube.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadFeed();
  }, []);

  const cats = CATEGORIES.filter(c => isSignedIn || c !== 'For You');

  const filteredVideos = liveVideos;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const ListHeader = (
    <View>
      {/* Sign-in banner */}
      {!isSignedIn && !bannerDismissed && (
        <View style={s.banner}>
          <Ionicons name="sparkles" size={20} color={C.accent} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Personalise your feed</Text>
            <Text style={s.bannerSub}>Sign in to get recommendations</Text>
          </View>
          <TouchableOpacity style={s.bannerBtn} onPress={() => router.push('/sign-in')}>
            <Text style={s.bannerBtnText}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setBannerDismissed(true)} hitSlop={12} style={{ marginLeft: 8 }}>
            <Ionicons name="close" size={18} color={C.dim} />
          </TouchableOpacity>
        </View>
      )}

      {/* Subscriptions shelf (signed in) */}
      {isSignedIn && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Subscriptions</Text>
          <SubscriptionShelf />
        </View>
      )}

      {/* Continue Watching (signed in) */}
      {isSignedIn && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Continue Watching</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14 }}>
            {CONTINUE_WATCHING.map(cw => (
              <ContinueCard key={cw.videoId} videoId={cw.videoId} progress={cw.progress} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
        {cats.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.chip, selectedCat === cat && s.chipActive]}
            onPress={() => setSelectedCat(cat)}
          >
            <Text style={[s.chipText, selectedCat === cat && s.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading && (
        <View style={s.state}>
          <ActivityIndicator color={C.accent} />
          <Text style={s.stateText}>Loading from YouTube…</Text>
        </View>
      )}
      {!loading && error && (
        <View style={s.state}>
          <Ionicons name="cloud-offline-outline" size={32} color={C.dim} />
          <Text style={s.stateTitle}>YouTube couldn’t be reached</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadFeed}>
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && !error && liveVideos.length === 0 && (
        <View style={s.state}>
          <Ionicons name="videocam-off-outline" size={32} color={C.dim} />
          <Text style={s.stateTitle}>No videos found</Text>
          <Text style={s.stateText}>Try exploring YouTube from the search tab.</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[s.root]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <Text style={s.logo}>vyde</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} hitSlop={8} onPress={() => router.push('/(tabs)/explore')}>
            <Ionicons name="search-outline" size={23} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={23} color={C.text} />
          </TouchableOpacity>
          {isSignedIn && (
            <TouchableOpacity style={[s.userAvatar, { backgroundColor: C.accent }]} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={s.userAvatarText}>{user?.initials}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={loading || error ? [] : filteredVideos}
        keyExtractor={v => v.id}
        renderItem={({ item }) => <VideoCard video={item} />}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  logo: { color: C.text, fontSize: 28, fontFamily: 'Outfit_700Bold', letterSpacing: -1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 7 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  userAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, marginTop: 12, marginBottom: 4,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.borderLight,
    borderRadius: 14, padding: 14,
  },
  bannerTitle: { color: C.text, fontSize: 13, fontWeight: '600', fontFamily: 'Outfit_600SemiBold' },
  bannerSub: { color: C.muted, fontSize: 12, marginTop: 1 },
  bannerBtn: { backgroundColor: C.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginLeft: 10 },
  bannerBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  section: { paddingTop: 18 },
  sectionLabel: { color: C.text, fontSize: 14, fontFamily: 'Outfit_600SemiBold', paddingHorizontal: 14, marginBottom: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: C.hover, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderLight,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.muted, fontSize: 13, fontFamily: 'Outfit_500Medium' },
  chipTextActive: { color: '#fff' },
  state: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 34, gap: 8 },
  stateTitle: { color: C.text, fontSize: 16, fontFamily: 'Outfit_700Bold', textAlign: 'center' },
  stateText: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: { backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9, marginTop: 4 },
  retryText: { color: '#fff', fontSize: 13, fontFamily: 'Outfit_700Bold' },
});
