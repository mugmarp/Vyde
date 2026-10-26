import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  FlatList, StyleSheet, Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import VideoCard from '@/components/VideoCard';
import { LiveVideo, fetchLiveFeed, searchYouTube } from '@/api/youtube';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<LiveVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingVideos, setTrendingVideos] = useState<LiveVideo[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const categories = ['Music', 'Gaming', 'Technology', 'Science', 'Travel', 'Sports', 'News', 'Comedy'];
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    let active = true;
    fetchLiveFeed().then(response => {
      if (active) setTrendingVideos(response.items);
    }).catch(err => {
      if (active) setTrendingError(err instanceof Error ? err.message : 'Could not load trending videos.');
    }).finally(() => {
      if (active) setTrendingLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await searchYouTube(query.trim());
        setResults(response.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not search YouTube.');
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={[s.root]}>

      {/* Header with search */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <Text style={s.logo}>vyde</Text>
        <View style={[s.searchBar, focused && s.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color={C.muted} style={{ marginLeft: 12 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search videos, channels…"
            placeholderTextColor={C.dim}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="search"
            selectionColor={C.accent}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} style={{ marginRight: 10 }}>
              <Ionicons name="close-circle" size={18} color={C.dim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search results */}
      {query.length > 1 ? (
        <FlatList
          data={results}
          keyExtractor={v => v.id}
          renderItem={({ item }) => <VideoCard video={item} />}
          ListHeaderComponent={loading ? (
            <View style={s.searchState}><ActivityIndicator color={C.accent} /><Text style={s.emptyText}>Searching YouTube…</Text></View>
          ) : error ? (
            <View style={s.searchState}><Ionicons name="cloud-offline-outline" size={32} color={C.dim} /><Text style={s.emptyText}>{error}</Text></View>
          ) : null}
          ListEmptyComponent={!loading && !error ? (
            <View style={s.emptyWrap}>
              <Ionicons name="search-outline" size={40} color={C.dim} />
              <Text style={s.emptyText}>No results for "{query}"</Text>
            </View>
          ) : null}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

          <View style={s.section}>
            <Text style={s.sectionLabel}>Browse categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 18 }}>
              {categories.map(category => (
                <TouchableOpacity key={category} style={s.categoryChip} onPress={() => setQuery(category)}>
                  <Text style={s.categoryChipText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.sectionLabel}>Popular right now</Text>
            {trendingLoading && <View style={s.searchState}><ActivityIndicator color={C.accent} /><Text style={s.emptyText}>Loading live videos…</Text></View>}
            {!trendingLoading && trendingError && (
              <View style={s.searchState}>
                <Ionicons name="cloud-offline-outline" size={32} color={C.dim} />
                <Text style={s.emptyText}>{trendingError}</Text>
              </View>
            )}
            {!trendingLoading && !trendingError && trendingVideos.length === 0 && (
              <View style={s.emptyWrap}><Text style={s.emptyText}>No trending videos were returned.</Text></View>
            )}
            {!trendingLoading && !trendingError && trendingVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 14, paddingBottom: 12, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  logo: { color: C.text, fontSize: 28, fontFamily: 'Outfit_700Bold', letterSpacing: -1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.elevated, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, height: 44,
  },
  searchBarFocused: { borderColor: C.accent },
  searchInput: {
    flex: 1, color: C.text, fontSize: 15,
    paddingHorizontal: 10, height: '100%',
    fontFamily: 'Outfit_400Regular',
  },
  section: { paddingTop: 24, paddingHorizontal: 14 },
  sectionLabel: { color: C.text, fontSize: 16, fontFamily: 'Outfit_700Bold', marginBottom: 14 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.elevated, borderRadius: 18, borderWidth: 1, borderColor: C.borderLight },
  categoryChipText: { color: C.muted, fontSize: 13, fontFamily: 'Outfit_500Medium' },
  trendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  trendIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  trendText: { color: C.text, fontSize: 14, fontFamily: 'Outfit_400Regular', flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '47.5%', aspectRatio: 16 / 9,
    borderRadius: 12, overflow: 'hidden', position: 'relative',
    backgroundColor: '#111',
  },
  catImage: { width: '100%', height: '100%' },
  catOverlay: { ...StyleSheet.absoluteFillObject },
  catContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  catLabel: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_700Bold' },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: C.muted, fontSize: 16, fontFamily: 'Outfit_400Regular' },
  searchState: { alignItems: 'center', paddingTop: 28, gap: 10 },
});
