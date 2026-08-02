import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

function Row({
  icon, label, value, toggle, onToggle, detail, onPress, destructive,
}: {
  icon: string; label: string; value?: string;
  toggle?: boolean; onToggle?: (v: boolean) => void;
  detail?: string; onPress?: () => void; destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress && toggle === undefined}>
      <View style={s.rowIcon}>
        <Ionicons name={icon as any} size={18} color={destructive ? '#ef4444' : C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, destructive && { color: '#ef4444' }]}>{label}</Text>
        {detail && <Text style={s.rowDetail}>{detail}</Text>}
      </View>
      {value !== undefined && <Text style={s.rowValue}>{value}</Text>}
      {toggle !== undefined && (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: C.border, true: C.accent }}
          thumbColor="#fff"
          ios_backgroundColor={C.border}
        />
      )}
      {onPress && toggle === undefined && (
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
  const { user, signOut } = useAuth();

  const [autoplay, setAutoplay]         = useState(true);
  const [hdr, setHdr]                   = useState(false);
  const [wifiOnlyDl, setWifiOnlyDl]     = useState(true);
  const [autoDeleteDl, setAutoDeleteDl] = useState(false);
  const [gesturesBright, setGB]         = useState(true);
  const [gesturesVol, setGV]            = useState(true);
  const [gesturesSeek, setGS]           = useState(true);
  const [darkMode]                      = useState(true);
  const [reducedMotion, setRM]          = useState(false);

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

        {/* Account */}
        {user && (
          <Section title="Account">
            <View style={s.accountRow}>
              <View style={[s.accountAvatar, { backgroundColor: C.accent }]}>
                <Text style={s.accountAvatarText}>{user.initials}</Text>
              </View>
              <View>
                <Text style={s.accountName}>{user.name}</Text>
                <Text style={s.accountEmail}>{user.email}</Text>
              </View>
            </View>
            <Row icon="person-outline" label="Edit profile" onPress={() => {}} />
            <Row icon="shield-checkmark-outline" label="Privacy & data" onPress={() => {}} />
            <Row
              icon="log-out-outline" label="Sign out" destructive
              onPress={() => {
                Alert.alert('Sign out', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: () => { signOut(); router.back(); } },
                ]);
              }}
            />
          </Section>
        )}

        {/* Playback */}
        <Section title="Playback">
          <Row icon="play-circle-outline" label="Autoplay next video" toggle={autoplay} onToggle={setAutoplay} />
          <Row icon="film-outline" label="Default quality" value="1080p" onPress={() => {}} />
          <Row icon="sunny-outline" label="HDR (when available)" toggle={hdr} onToggle={setHdr} />
          <Row icon="speedometer-outline" label="Playback speed" value="1×" onPress={() => {}} />
        </Section>

        {/* Downloads */}
        <Section title="Downloads">
          <Row icon="wifi-outline" label="Wi-Fi only" detail="Only download on Wi-Fi connections" toggle={wifiOnlyDl} onToggle={setWifiOnlyDl} />
          <Row icon="folder-outline" label="Download quality" value="1080p" onPress={() => {}} />
          <Row icon="trash-outline" label="Auto-delete watched" toggle={autoDeleteDl} onToggle={setAutoDeleteDl} />
          <Row icon="lock-closed-outline" label="Storage sandbox" detail="Downloads are sandboxed to Vyde's secure storage" />
        </Section>

        {/* Gestures */}
        <Section title="Player Gestures">
          <Row icon="sunny-outline" label="Brightness swipe" detail="Left edge — swipe up/down to adjust" toggle={gesturesBright} onToggle={setGB} />
          <Row icon="volume-medium-outline" label="Volume swipe" detail="Right edge — swipe up/down to adjust" toggle={gesturesVol} onToggle={setGV} />
          <Row icon="rewind-outline" label="Double-tap to seek" detail="10 seconds back or forward" toggle={gesturesSeek} onToggle={setGS} />
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Row icon="moon-outline" label="Dark mode" detail="Vyde is always dark" toggle={darkMode} />
          <Row icon="accessibility-outline" label="Reduce motion" toggle={reducedMotion} onToggle={setRM} />
          <Row icon="text-outline" label="Caption style" onPress={() => {}} />
        </Section>

        {/* About */}
        <Section title="About">
          <Row icon="information-circle-outline" label="Version" value="1.0.0" />
          <Row icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
          <Row icon="shield-outline" label="Privacy Policy" onPress={() => {}} />
          <Row icon="help-circle-outline" label="Help & feedback" onPress={() => {}} />
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
