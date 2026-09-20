import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '@/context/AppContext';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

const USED_GB = 4.7;
const TOTAL_GB = 128;
const pct = USED_GB / TOTAL_GB;

function StorageBar() {
  return (
    <LinearGradient colors={['#0C0C12', '#050507']} style={sb.wrap}>
      <View style={sb.row}>
        <View>
          <Text style={sb.used}>{USED_GB} GB</Text>
          <Text style={sb.label}>used of {TOTAL_GB} GB</Text>
        </View>
        <View style={sb.segments}>
          <View style={sb.seg}>
            <View style={[sb.dot, { backgroundColor: C.accent }]} />
            <Text style={sb.segLabel}>Videos  {(USED_GB * 0.72).toFixed(1)}GB</Text>
          </View>
          <View style={sb.seg}>
            <View style={[sb.dot, { backgroundColor: '#3A7BD5' }]} />
            <Text style={sb.segLabel}>Audio  {(USED_GB * 0.28).toFixed(1)}GB</Text>
          </View>
        </View>
      </View>
      <View style={sb.track}>
        <View style={[sb.fillVideo, { flex: pct * 0.72 }]} />
        <View style={[sb.fillAudio,  { flex: pct * 0.28 }]} />
        <View style={{ flex: 1 - pct }} />
      </View>
      <Text style={sb.free}>{(TOTAL_GB - USED_GB).toFixed(1)} GB free</Text>
    </LinearGradient>
  );
}

const sb = StyleSheet.create({
  wrap: { marginHorizontal: 14, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.borderLight },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  used: { color: C.text, fontSize: 28, fontFamily: 'Outfit_700Bold' },
  label: { color: C.muted, fontSize: 12 },
  segments: { gap: 6, alignItems: 'flex-end' },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  segLabel: { color: C.muted, fontSize: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.border, flexDirection: 'row', overflow: 'hidden' },
  fillVideo: { backgroundColor: C.accent },
  fillAudio: { backgroundColor: '#3A7BD5' },
  free: { color: C.dim, fontSize: 11, marginTop: 8, textAlign: 'right' },
});

function DownloadRow({ item, onRemove }: { item: ReturnType<() => ReturnType<typeof require>> | any; onRemove: () => void }) {
  const statusColor = item.status === 'active' ? C.accent : item.status === 'queued' ? C.muted : '#52B788';
  const statusLabel = item.status === 'active' ? `Downloading · ${item.speedMbps} MB/s` : item.status === 'queued' ? 'Queued' : 'Downloaded';

  return (
    <View style={dr.row}>
      <View style={dr.thumbWrap}>
        <Image source={item.thumbnail} style={[dr.thumb, item.status === 'queued' && { opacity: 0.4 }]} contentFit="cover" />
        {item.status === 'completed' && (
          <View style={dr.checkBadge}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={dr.title} numberOfLines={2}>{item.title}</Text>
        <Text style={dr.channel}>{item.channel} · {item.duration}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={[dr.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[dr.status, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        {item.status === 'active' && (
          <View style={dr.track}>
            <View style={[dr.fill, { width: `${Math.round(item.progress * 100)}%` as any }]} />
          </View>
        )}
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={10} style={dr.del}>
        <Ionicons name="trash-outline" size={18} color={C.dim} />
      </TouchableOpacity>
    </View>
  );
}

const dr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  thumbWrap: { width: 100, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: '#111', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  checkBadge: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#52B788', alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold', lineHeight: 18 },
  channel: { color: C.dim, fontSize: 11, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 11, fontFamily: 'Outfit_500Medium' },
  track: { height: 3, backgroundColor: C.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: C.accent },
  del: { paddingLeft: 4, paddingTop: 4 },
});

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { downloads, playlists, removeDownload } = useAppContext();
  const [tab, setTab] = useState<'downloads' | 'playlists'>('downloads');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const active    = downloads.filter(d => d.status === 'active');
  const queued    = downloads.filter(d => d.status === 'queued');
  const completed = downloads.filter(d => d.status === 'completed');

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <Text style={s.logo}>vyde</Text>
        <TouchableOpacity hitSlop={10}>
          <Ionicons name="add-circle-outline" size={26} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['downloads', 'playlists'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {tab === 'downloads' ? (
          <>
            <View style={{ paddingTop: 16 }}>
              <StorageBar />
            </View>

            {active.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>Downloading</Text>
                <View style={{ paddingHorizontal: 14 }}>
                  {active.map(d => (
                    <DownloadRow key={d.videoId} item={d} onRemove={() => removeDownload(d.videoId)} />
                  ))}
                </View>
              </View>
            )}

            {queued.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>Queued</Text>
                <View style={{ paddingHorizontal: 14 }}>
                  {queued.map(d => (
                    <DownloadRow key={d.videoId} item={d} onRemove={() => removeDownload(d.videoId)} />
                  ))}
                </View>
              </View>
            )}

            {completed.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>Downloaded</Text>
                <View style={{ paddingHorizontal: 14 }}>
                  {completed.map(d => (
                    <DownloadRow key={d.videoId} item={d} onRemove={() => removeDownload(d.videoId)} />
                  ))}
                </View>
              </View>
            )}

            {downloads.length === 0 && (
              <View style={s.empty}>
                <Ionicons name="cloud-download-outline" size={44} color={C.dim} />
                <Text style={s.emptyTitle}>No downloads yet</Text>
                <Text style={s.emptyBody}>Videos you download will appear here for offline viewing.</Text>
              </View>
            )}
          </>
        ) : (
          <View style={{ paddingHorizontal: 14, paddingTop: 16 }}>
            {playlists.map(pl => (
              <TouchableOpacity key={pl.id} style={s.plRow} activeOpacity={0.8}>
                <View style={s.plIcon}>
                  <Ionicons name={pl.isPrivate ? 'lock-closed' : 'list'} size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.plName}>{pl.name}</Text>
                  <Text style={s.plMeta}>{pl.count} videos{pl.isPrivate ? ' · Private' : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.dim} />
              </TouchableOpacity>
            ))}
            {playlists.length === 0 && (
              <View style={s.empty}>
                <Ionicons name="list-outline" size={44} color={C.dim} />
                <Text style={s.emptyTitle}>No local playlists yet</Text>
                <Text style={s.emptyBody}>Create a Vyde playlist to organize videos on this device.</Text>
              </View>
            )}
            <TouchableOpacity style={s.newPlaylist}>
              <Ionicons name="add" size={18} color={C.accent} />
              <Text style={s.newPlaylistText}>New playlist</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  logo: { color: C.text, fontSize: 28, fontFamily: 'Outfit_700Bold', letterSpacing: -1 },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 14, paddingTop: 14, gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: C.hover, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderLight,
  },
  tabBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabLabel: { color: C.muted, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  tabLabelActive: { color: '#fff' },
  section: { paddingTop: 20 },
  sectionLabel: { color: C.text, fontSize: 14, fontFamily: 'Outfit_700Bold', paddingHorizontal: 14, marginBottom: 4 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { color: C.text, fontSize: 18, fontFamily: 'Outfit_700Bold' },
  emptyBody: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  plRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  plIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  plName: { color: C.text, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  plMeta: { color: C.dim, fontSize: 12, marginTop: 2 },
  newPlaylist: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 16, marginTop: 8,
  },
  newPlaylistText: { color: C.accent, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
});
