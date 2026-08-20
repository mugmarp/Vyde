import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  FlatList, StyleSheet, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TRENDING_SEARCHES, EXPLORE_CATEGORIES, VIDEOS } from '@/data/mockData';
import VideoCard from '@/components/VideoCard';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

const CATEGORY_THUMBNAILS: Record<string, number> = {
  gaming:  require('../../assets/images/thumb-gaming.jpg'),
  science: require('../../assets/images/thumb-space.jpg'),
  tech:    require('../../assets/images/thumb-tech.jpg'),
  travel:  require('../../assets/images/thumb-nature.jpg'),
  music:   require('../../assets/images/thumb-space.jpg'),
  sports:  require('../../assets/images/thumb-gaming.jpg'),
  news:    require('../../assets/images/thumb-city.jpg'),
  comedy:  require('../../assets/images/thumb-city.jpg'),
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const searchResults = query.length > 1
    ? VIDEOS.filter(v =>
        v.title.toLowerCase().includes(query.toLowerCase()) ||
        v.channel.toLowerCase().includes(query.toLowerCase())
      )
    : [];

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
          data={searchResults}
          keyExtractor={v => v.id}
          renderItem={({ item }) => <VideoCard video={item} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="search-outline" size={40} color={C.dim} />
              <Text style={s.emptyText}>No results for "{query}"</Text>
            </View>
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Trending searches */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Trending</Text>
            {TRENDING_SEARCHES.map((term, i) => (
              <TouchableOpacity
                key={i}
                style={s.trendRow}
                onPress={() => setQuery(term)}
                activeOpacity={0.7}
              >
                <View style={s.trendIcon}>
                  <Ionicons name="trending-up" size={16} color={C.accent} />
                </View>
                <Text style={s.trendText}>{term}</Text>
                <Ionicons name="arrow-forward-outline" size={16} color={C.dim} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Categories grid */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Browse Categories</Text>
            <View style={s.grid}>
              {EXPLORE_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.id} style={s.catCard} activeOpacity={0.82}>
                  <Image source={CATEGORY_THUMBNAILS[cat.id]} style={s.catImage} contentFit="cover" />
                  <View style={[s.catOverlay, { backgroundColor: cat.color + 'CC' }]} />
                  <View style={s.catContent}>
                    <Ionicons name={cat.icon as any} size={22} color="#fff" />
                    <Text style={s.catLabel}>{cat.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
});
