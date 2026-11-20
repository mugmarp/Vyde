import React from 'react';
import {
  Alert, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAppContext } from '@/context/AppContext';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

function Row({
  icon, label, value, detail, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value?: string;
  detail?: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={s.rowIcon}>
          <Ionicons name={icon} size={18} color={C.accent} />
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
  const { history, subscriptions, storageError, clearHistory, clearLocalData } = useAppContext();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const version = Constants.expoConfig?.version ?? 'Unknown';

  const confirmClearHistory = () => {
    if (history.length === 0) return;
    Alert.alert(
      'Clear watch history?',
      'This removes recent history from this device. Saved videos, playlists, and subscriptions will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear history', style: 'destructive', onPress: clearHistory },
      ],
    );
  };

  const confirmClearLocalData = () => {
    Alert.alert(
      'Clear all Vyde data?',
      'This permanently removes local likes, saves, playlists, watch history, subscribed channels, and cached data from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all data', style: 'destructive', onPress: clearLocalData },
      ],
    );
  };

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

        <Section title="Local data & Subscriptions">
          <Row
            icon="people-outline"
            label="Subscribed channels"
            value={`${subscriptions.length}`}
            detail="Stored locally in isolated SQLite database."
          />
          <Row
            icon="time-outline"
            label="Clear watch history"
            value={`${history.length}`}
            detail="Saved videos, playlists, and subscriptions will remain."
            onPress={history.length > 0 ? confirmClearHistory : undefined}
          />
          <Row
            icon="trash-outline"
            label="Clear all Vyde data"
            detail="Removes local likes, saves, playlists, subscriptions, and history."
            onPress={confirmClearLocalData}
          />
          {storageError && (
            <View style={s.storageError}>
              <Ionicons name="warning-outline" size={17} color={C.accent} />
              <Text style={s.storageErrorText}>{storageError}</Text>
            </View>
          )}
        </Section>

        <Section title="Storage & Privacy">
          <Row
            icon="server-outline"
            label="Database engine"
            value={Platform.OS === 'web' ? 'AsyncStorage' : 'SQLite (WAL)'}
            detail="Client-side persistent database with zero remote telemetry."
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy model"
            value="100% On-Device"
            detail="No mandatory account or tracking. Direct stream deciphering."
          />
        </Section>

        <Section title="About">
          <Row icon="information-circle-outline" label="Version" value={version} />
          <Row
            icon="phone-portrait-outline"
            label="Offline storage"
            detail="Likes, saves, playlists, downloads, and history stay on this device."
          />
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
  storageError: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14 },
  storageErrorText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 18 },
});
