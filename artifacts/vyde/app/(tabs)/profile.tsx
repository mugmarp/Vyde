import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { CHANNELS, VIDEOS } from '@/data/mockData';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

const STATS = [
  { label: 'Subscribed', value: '6' },
  { label: 'Watched', value: '847' },
  { label: 'Hours', value: '312' },
];

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.pill}>
      <Text style={st.val}>{value}</Text>
      <Text style={st.lbl}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', backgroundColor: C.elevated, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: C.borderLight },
  val: { color: C.text, fontSize: 22, fontFamily: 'Outfit_700Bold' },
  lbl: { color: C.dim, fontSize: 11, marginTop: 2 },
});

const QUICK_LINKS = [
  { icon: 'time-outline',          label: 'Watch history',   count: '847' },
  { icon: 'heart-outline',         label: 'Liked videos',    count: '34' },
  { icon: 'list-outline',          label: 'Playlists',       count: '3' },
  { icon: 'cloud-download-outline',label: 'Downloads',       count: '4' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { isSignedIn, user, signOut } = useAuth();
  const { likedVideoIds } = useAppContext();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // ── Signed out ──────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <View style={[s.root, { paddingTop: topPad }]}>
        <LinearGradient colors={['#0C0C12', '#050507']} style={s.signedOutHero}>
          <View style={s.vydeMarkWrap}>
            <Text style={s.vydeMark}>V</Text>
          </View>
          <Text style={s.heroTitle}>Your content, personalised</Text>
          <Text style={s.heroSub}>Sign in to access your history, subscriptions, and recommendations.</Text>
        </LinearGradient>

        <View style={s.featureBullets}>
          {[
            ['sparkles-outline', 'Personalised recommendations'],
            ['bookmark-outline', 'Sync your Watch Later list'],
            ['cloud-download-outline', 'Download for offline viewing'],
            ['notifications-outline', 'Get alerts from your channels'],
          ].map(([icon, text]) => (
            <View key={text} style={s.bullet}>
              <Ionicons name={icon as any} size={18} color={C.accent} />
              <Text style={s.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.googleBtn} onPress={() => router.push('/sign-in')} activeOpacity={0.88}>
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={s.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn}>
          <Text style={s.skipBtnText}>Continue without signing in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Signed in ───────────────────────────────────────────────────────────
  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header banner */}
      <LinearGradient colors={['#1a0800', '#050507']} style={[s.heroBanner, { paddingTop: topPad + 16 }]}>
        <View style={s.profileRow}>
          <View style={[s.bigAvatar, { backgroundColor: C.accent }]}>
            <Text style={s.bigAvatarText}>{user?.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{user?.name}</Text>
            <Text style={s.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={10}>
            <Ionicons name="settings-outline" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {STATS.map(stat => <StatPill key={stat.label} {...stat} />)}
        </View>
      </LinearGradient>

      {/* Quick links */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Your Content</Text>
        <View style={{ gap: 2 }}>
          {QUICK_LINKS.map(link => (
            <TouchableOpacity key={link.label} style={s.linkRow} activeOpacity={0.7}>
              <View style={s.linkIcon}>
                <Ionicons name={link.icon as any} size={20} color={C.accent} />
              </View>
              <Text style={s.linkLabel}>{link.label}</Text>
              <Text style={s.linkCount}>{link.count}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.dim} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Subscriptions */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Subscriptions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
          {CHANNELS.map(ch => (
            <View key={ch.id} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: ch.color, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{ch.initials}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={1}>{ch.name.split(' ')[0]}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Liked videos preview */}
      {likedVideoIds.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Liked Videos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {VIDEOS.filter(v => likedVideoIds.includes(v.id)).map(v => (
              <TouchableOpacity
                key={v.id}
                style={{ width: 160 }}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/player', params: { id: v.id } })}
              >
                <View style={{ width: 160, height: 90, borderRadius: 10, overflow: 'hidden', backgroundColor: '#111' }}>
                  <Image source={v.thumbnail} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
                <Text style={{ color: C.text, fontSize: 12, fontFamily: 'Outfit_600SemiBold', marginTop: 6 }} numberOfLines={2}>{v.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity
        style={s.signOutBtn}
        onPress={() => {
          Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
          ]);
        }}
      >
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  signedOutHero: {
    alignItems: 'center', paddingTop: 60, paddingBottom: 32, paddingHorizontal: 32,
  },
  vydeMarkWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  vydeMark: { color: '#fff', fontSize: 36, fontFamily: 'Outfit_700Bold' },
  heroTitle: { color: C.text, fontSize: 22, fontFamily: 'Outfit_700Bold', textAlign: 'center', marginBottom: 10 },
  heroSub: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  featureBullets: { paddingHorizontal: 32, paddingTop: 28, gap: 14 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bulletText: { color: C.muted, fontSize: 15 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.accent, marginHorizontal: 24, marginTop: 36,
    paddingVertical: 14, borderRadius: 14, justifyContent: 'center',
  },
  googleBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' },
  skipBtn: { paddingVertical: 16, alignItems: 'center' },
  skipBtnText: { color: C.muted, fontSize: 14 },
  heroBanner: { paddingHorizontal: 16, paddingBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  bigAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { color: '#fff', fontSize: 22, fontFamily: 'Outfit_700Bold' },
  userName: { color: C.text, fontSize: 18, fontFamily: 'Outfit_700Bold' },
  userEmail: { color: C.muted, fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  section: { paddingHorizontal: 14, paddingTop: 24 },
  sectionLabel: { color: C.text, fontSize: 14, fontFamily: 'Outfit_700Bold', marginBottom: 12 },
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
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 14, marginTop: 32, paddingVertical: 14,
    borderWidth: 1, borderColor: '#ef444430', borderRadius: 14,
    paddingHorizontal: 16, backgroundColor: '#ef44440A',
  },
  signOutText: { color: '#ef4444', fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
});
