import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

function Row({
  icon, label, value, detail, onPress,
}: {
  icon: string; label: string; value?: string;
  detail?: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={s.rowIcon}>
        <Ionicons name={icon as any} size={18} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {detail && <Text style={s.rowDetail}>{detail}</Text>}
      </View>
      {value !== undefined && <Text style={s.rowValue}>{value}</Text>}
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={C.dim} />
      )}
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

        <Section title="Playback">
          <Row icon="play-circle-outline" label="Native playback" detail="Vyde tries compatible formats on mobile. If playback fails, open the video in YouTube." />
        </Section>

        <Section title="Offline media">
          <Row icon="cloud-download-outline" label="YouTube downloads are unavailable" detail="Use YouTube’s official offline feature where it is offered." />
        </Section>

        <Section title="Account and local data">
          <Row icon="phone-portrait-outline" label="Stored on this device" detail="Likes, saves, playlists, and watch history are not synced to a YouTube account." />
          <Row icon="person-outline" label="YouTube account connection" value="Not connected" />
        </Section>

        <Section title="About">
          <Row icon="information-circle-outline" label="Version" value="1.0.0" />
        </Section>

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
  headerTitle: { color: C.text, fontSize: 18, fontFamily: 'Outfit_700Bold' },
  section: { paddingHorizontal: 14, paddingTop: 24 },
  sectionTitle: { color: C.dim, fontSize: 11, fontFamily: 'Outfit_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  card: { backgroundColor: C.elevated, borderRadius: 14, borderWidth: 1, borderColor: C.borderLight, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  rowIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.hover, alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { color: C.text, fontSize: 15, fontFamily: 'Outfit_500Medium' },
  rowDetail: { color: C.dim, fontSize: 11, marginTop: 1 },
  rowValue: { color: C.muted, fontSize: 14 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  accountAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_700Bold' },
  accountName: { color: C.text, fontSize: 16, fontFamily: 'Outfit_700Bold' },
  accountEmail: { color: C.muted, fontSize: 13, marginTop: 2 },
});
