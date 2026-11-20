import React, { useState } from 'react';
import {
  Alert, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
  success: '#22C55E', cardBg: '#101018',
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
  pill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.elevated,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  val: { color: C.text, fontSize: 18, fontFamily: 'Outfit_700Bold' },
  lbl: { color: C.dim, fontSize: 11, marginTop: 2, fontFamily: 'Outfit_500Medium' },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    likedVideoIds,
    savedVideoIds,
    history,
    playlists,
    subscriptions,
    toggleSubscription,
    googleUser,
    disconnectGoogle,
  } = useAppContext();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [subsModalVisible, setSubsModalVisible] = useState(false);

  const handleDisconnectGoogle = () => {
    Alert.alert(
      'Disconnect Google Account',
      'Are you sure you want to disconnect? Your local library and offline database will remain intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await disconnectGoogle();
          },
        },
      ],
    );
  };

  const handleUnsubscribe = (channelId: string, name: string) => {
    Alert.alert(
      'Unsubscribe',
      `Unsubscribe from ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleSubscription(channelId, name);
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
      {/* Header Profile Identity */}
      <View style={[s.localHeader, { paddingTop: topPad + 16 }]}>
        {googleUser?.avatar ? (
          <Image source={googleUser.avatar} style={s.avatarImg} contentFit="cover" />
        ) : (
          <View style={s.vydeMarkWrap}><Text style={s.vydeMark}>V</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <View style={s.identityHeaderRow}>
            <Text style={s.heroTitle} numberOfLines={1}>
              {googleUser ? googleUser.name : 'Your Vyde'}
            </Text>
            {googleUser ? (
              <View style={s.connectedBadge}>
                <View style={s.activeDot} />
                <Text style={s.connectedBadgeText}>Google Synced</Text>
              </View>
            ) : (
              <View style={s.privateBadge}>
                <Ionicons name="shield-checkmark" size={12} color={C.success} />
                <Text style={s.privateBadgeText}>100% Private</Text>
              </View>
            )}
          </View>
          <Text style={s.heroSub} numberOfLines={2}>
            {googleUser
              ? googleUser.email
              : 'Subscriptions, history & playlists stored strictly on-device.'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Ionicons name="settings-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={s.statsContainer}>
        <View style={s.statsRow}>
          <StatPill
            label="History"
            value={String(history.length)}
            onPress={() => router.push({ pathname: '/(tabs)/library', params: { tab: 'history' } })}
          />
          <StatPill
            label="Liked"
            value={String(likedVideoIds.length)}
            onPress={() => router.push({ pathname: '/(tabs)/library', params: { tab: 'liked' } })}
          />
          <StatPill
            label="Saved"
            value={String(savedVideoIds.length)}
            onPress={() => router.push({ pathname: '/(tabs)/library', params: { tab: 'saved' } })}
          />
          <StatPill
            label="Following"
            value={String(subscriptions.length)}
            onPress={() => setSubsModalVisible(true)}
          />
        </View>
      </View>

      {/* Account & Storage Architecture Card */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Account Bridge & Privacy</Text>
        <View style={s.accountCard}>
          {googleUser ? (
            <View>
              <View style={s.accountHeaderRow}>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.accountTitle}>{googleUser.name}</Text>
                  <Text style={s.accountSubtitle}>{googleUser.email}</Text>
                </View>
                <TouchableOpacity
                  style={s.disconnectBtn}
                  onPress={handleDisconnectGoogle}
                  activeOpacity={0.8}
                >
                  <Text style={s.disconnectBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.accountExplainer}>
                Connected via OAuth 2.0 PKCE. Your personal database remains isolated locally.
              </Text>
            </View>
          ) : (
            <View>
              <View style={s.accountHeaderRow}>
                <View style={s.shieldIconWrap}>
                  <Ionicons name="lock-closed" size={18} color={C.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.accountTitle}>Local Private Profile</Text>
                  <Text style={s.accountSubtitle}>Zero tracking • SQLite persistence</Text>
                </View>
                <View style={s.localStatusPill}>
                  <Text style={s.localStatusText}>Active</Text>
                </View>
              </View>
              <Text style={s.accountExplainer}>
                No Google account required. Vyde operates entirely client-side with full offline indexing and unthrottled streaming.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Subscribed Channels Section */}
      <View style={s.section}>
        <View style={s.sectionHeading}>
          <Text style={s.sectionLabel}>Followed Channels</Text>
          {subscriptions.length > 0 && (
            <TouchableOpacity onPress={() => setSubsModalVisible(true)}>
              <Text style={s.seeAll}>Manage ({subscriptions.length})</Text>
            </TouchableOpacity>
          )}
        </View>
        {subscriptions.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={30} color={C.dim} />
            <Text style={s.emptyStateText}>No channels followed yet.</Text>
            <Text style={s.emptyStateSub}>Tap "Follow" on any video player to subscribe locally.</Text>
          </View>
        ) : (
          <View style={s.subsListCard}>
            {subscriptions.slice(0, 4).map((sub, idx) => (
              <View
                key={sub.channelId}
                style={[
                  s.subRow,
                  idx === Math.min(subscriptions.length, 4) - 1 ? { borderBottomWidth: 0 } : null,
                ]}
              >
                {sub.thumbnail ? (
                  <Image source={sub.thumbnail} style={s.channelAvatar} contentFit="cover" />
                ) : (
                  <View style={s.channelAvatarFallback}>
                    <Text style={s.channelAvatarLetter}>{sub.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={s.channelName} numberOfLines={1}>{sub.name}</Text>
                  <Text style={s.channelMeta}>Local Subscription</Text>
                </View>
                <TouchableOpacity
                  style={s.unsubBtn}
                  onPress={() => handleUnsubscribe(sub.channelId, sub.name)}
                  hitSlop={8}
                >
                  <Text style={s.unsubBtnText}>Following</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* On this Device Quick Links */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>On this device</Text>
        <TouchableOpacity style={s.linkRow} onPress={() => router.push('/(tabs)/library')}>
          <View style={s.linkIcon}><Ionicons name="list-outline" size={20} color={C.accent} /></View>
          <Text style={s.linkLabel}>Local playlists</Text>
          <Text style={s.linkCount}>{playlists.length}</Text>
          <Ionicons name="chevron-forward" size={16} color={C.dim} />
        </TouchableOpacity>
      </View>

      {/* Recently Watched */}
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
            <Ionicons name="time-outline" size={30} color={C.dim} />
            <Text style={s.emptyStateText}>Videos you open will appear here.</Text>
          </View>
        ) : (
          history.slice(0, 5).map(item => (
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
          ))
        )}
      </View>

      {/* Full Subscriptions Modal */}
      <Modal
        visible={subsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSubsModalVisible(false)}
      >
        <View style={s.modalRoot}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Followed Channels ({subscriptions.length})</Text>
            <TouchableOpacity
              style={s.modalCloseBtn}
              onPress={() => setSubsModalVisible(false)}
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {subscriptions.length === 0 ? (
              <View style={[s.emptyState, { paddingTop: 60 }]}>
                <Ionicons name="people-outline" size={40} color={C.dim} />
                <Text style={s.emptyStateText}>No subscriptions yet</Text>
                <Text style={s.emptyStateSub}>Channels you follow in the video player will be listed here.</Text>
              </View>
            ) : (
              subscriptions.map(sub => (
                <View key={sub.channelId} style={s.modalSubRow}>
                  {sub.thumbnail ? (
                    <Image source={sub.thumbnail} style={s.channelAvatar} contentFit="cover" />
                  ) : (
                    <View style={s.channelAvatarFallback}>
                      <Text style={s.channelAvatarLetter}>{sub.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={s.channelName}>{sub.name}</Text>
                    <Text style={s.channelMeta}>Local database sync</Text>
                  </View>
                  <TouchableOpacity
                    style={s.unsubActionBtn}
                    onPress={() => handleUnsubscribe(sub.channelId, sub.name)}
                  >
                    <Text style={s.unsubActionText}>Unfollow</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  localHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  vydeMarkWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vydeMark: { color: '#fff', fontSize: 28, fontFamily: 'Outfit_700Bold' },
  avatarImg: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.elevated },
  identityHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroTitle: { color: C.text, fontSize: 20, fontFamily: 'Outfit_700Bold' },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  connectedBadgeText: { color: C.success, fontSize: 10, fontFamily: 'Outfit_600SemiBold' },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(232, 74, 39, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 74, 39, 0.25)',
  },
  privateBadgeText: { color: C.accent, fontSize: 10, fontFamily: 'Outfit_600SemiBold' },
  heroSub: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },

  statsContainer: { paddingHorizontal: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },

  section: { paddingHorizontal: 14, paddingTop: 22 },
  sectionLabel: { color: C.text, fontSize: 14, fontFamily: 'Outfit_700Bold', marginBottom: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { color: C.accent, fontSize: 13, fontFamily: 'Outfit_600SemiBold', marginBottom: 10 },

  accountCard: {
    backgroundColor: C.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  accountHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  shieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(232, 74, 39, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitle: { color: C.text, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  accountSubtitle: { color: C.dim, fontSize: 11, marginTop: 2 },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#27171A',
    borderWidth: 1,
    borderColor: '#4E2125',
  },
  disconnectBtnText: { color: '#FF6B6B', fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
  localStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  localStatusText: { color: C.success, fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
  accountExplainer: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 10 },

  subsListCard: {
    backgroundColor: C.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
    overflow: 'hidden',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  channelAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.hover },
  channelAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.hover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelAvatarLetter: { color: C.text, fontSize: 16, fontFamily: 'Outfit_700Bold' },
  channelName: { color: C.text, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  channelMeta: { color: C.dim, fontSize: 11, marginTop: 2 },
  unsubBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: C.hover,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  unsubBtnText: { color: C.muted, fontSize: 11, fontFamily: 'Outfit_600SemiBold' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
    backgroundColor: C.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  emptyStateText: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  emptyStateSub: { color: C.dim, fontSize: 11, textAlign: 'center', paddingHorizontal: 20 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { color: C.text, fontSize: 14, flex: 1, fontFamily: 'Outfit_500Medium' },
  linkCount: { color: C.dim, fontSize: 13, marginRight: 6 },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  historyThumb: { width: 104, height: 58, borderRadius: 7, backgroundColor: C.elevated },
  historyTitle: { color: C.text, fontSize: 13, fontFamily: 'Outfit_600SemiBold', lineHeight: 18 },
  historyMeta: { color: C.dim, fontSize: 11, marginTop: 4 },

  modalRoot: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  modalTitle: { color: C.text, fontSize: 16, fontFamily: 'Outfit_700Bold' },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  unsubActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 74, 39, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 74, 39, 0.3)',
  },
  unsubActionText: { color: C.accent, fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
});
