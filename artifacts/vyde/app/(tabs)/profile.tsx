import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { Image } from 'expo-image';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

function StatPill({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={st.pill}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={st.val}>{value}</Text>
      <Text style={st.lbl}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', backgroundColor: C.elevated, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: C.borderLight },
  val: { color: C.text, fontSize: 22, fontFamily: 'Outfit_700Bold' },
  lbl: { color: C.dim, fontSize: 11, marginTop: 2 },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { likedVideoIds, savedVideoIds, history, playlists } = useAppContext();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={[s.localHeader, { paddingTop: topPad + 20 }]}>
        <View style={s.vydeMarkWrap}><Text style={s.vydeMark}>V</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.heroTitle}>Your Vyde</Text>
          <Text style={s.heroSub}>Your likes, saves, playlists, and watch history stay on this device.</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={10}>
          <Ionicons name="settings-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        <StatPill label="History" value={String(history.length)} onPress={() => router.push({ pathname: '/(tabs)/library', params: { tab: 'history' } })} />
        <StatPill label="Liked" value={String(likedVideoIds.length)} onPress={() => router.push({ pathname: '/(tabs)/library', params: { tab: 'liked' } })} />
        <StatPill label="Saved" value={String(savedVideoIds.length)} onPress={() => router.push({ pathname: '/(tabs)/library', params: { tab: 'saved' } })} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionLabel}>On this device</Text>
        <TouchableOpacity style={s.linkRow} onPress={() => router.push('/(tabs)/library')}>
          <View style={s.linkIcon}><Ionicons name="list-outline" size={20} color={C.accent} /></View>
          <Text style={s.linkLabel}>Local playlists</Text>
          <Text style={s.linkCount}>{playlists.length}</Text>
          <Ionicons name="chevron-forward" size={16} color={C.dim} />
        </TouchableOpacity>
        <View style={s.localNotice}>
          <Ionicons name="information-circle-outline" size={18} color={C.muted} />
          <Text style={s.localNoticeText}>Vyde is not connected to a YouTube account. These actions do not sync with YouTube.</Text>
        </View>
      </View>

      <View style={s.section}>
        <View style={s.sectionHeading}>
          <Text style={s.sectionLabel}>Recently watched</Text>
          {history.length > 5 && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/library', params: { tab: 'history' } })}
              accessibilityRole="button"
              accessibilityLabel="See all watch history"
            >
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        {history.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="time-outline" size={32} color={C.dim} />
            <Text style={s.heroSub}>Videos you open will appear here.</Text>
          </View>
        ) : history.slice(0, 5).map(item => (
          <TouchableOpacity
            key={item.videoId}
            style={s.historyRow}
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: '/player',
              params: {
                id: item.videoId,
                title: item.title,
                channel: item.channel,
                thumbnail: item.thumbnail,
              },
            })}
          >
            <Image source={item.thumbnail} style={s.historyThumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={s.historyTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={s.historyMeta}>{item.channel}</Text>
            </View>
            <Ionicons name="play-circle-outline" size={22} color={C.muted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  localHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 22 },
  localNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: C.elevated },
  localNoticeText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 17 },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  historyThumb: { width: 104, height: 58, borderRadius: 7, backgroundColor: C.elevated },
  historyTitle: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold', lineHeight: 18 },
  historyMeta: { color: C.dim, fontSize: 11, marginTop: 4 },
  vydeMarkWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  vydeMark: { color: '#fff', fontSize: 36, fontFamily: 'Outfit_700Bold' },
  heroTitle: { color: C.text, fontSize: 22, fontFamily: 'Outfit_700Bold', textAlign: 'left', marginBottom: 4 },
  heroSub: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  statsRow: { flexDirection: 'row', gap: 8 },
  section: { paddingHorizontal: 14, paddingTop: 24 },
  sectionLabel: { color: C.text, fontSize: 14, fontFamily: 'Outfit_700Bold', marginBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { color: C.accent, fontSize: 13, fontFamily: 'Outfit_600SemiBold', marginBottom: 12 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  linkIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  linkLabel: { color: C.text, fontSize: 15, flex: 1 },
  linkCount: { color: C.dim, fontSize: 13, marginRight: 6 },
});
