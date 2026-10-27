import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LocalVideoMetadata, Playlist, useAppContext } from '@/context/AppContext';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

type LibraryTab = 'history' | 'saved' | 'liked' | 'playlists' | 'offline';
const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'history', label: 'History' },
  { key: 'saved', label: 'Saved' },
  { key: 'liked', label: 'Liked' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'offline', label: 'Offline' },
];

function isLibraryTab(value: string | undefined): value is LibraryTab {
  return TABS.some(tab => tab.key === value);
}

function LocalVideoRow({
  videoId,
  metadata,
  onRemove,
}: {
  videoId: string;
  metadata?: LocalVideoMetadata;
  onRemove?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={s.videoRow}>
      <TouchableOpacity
        style={s.videoMain}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Open ${metadata?.title ?? `video ${videoId}`}`}
        onPress={() => router.push({
          pathname: '/player',
          params: {
            id: videoId,
            ...(metadata?.title ? { title: metadata.title } : {}),
            ...(metadata?.channel ? { channel: metadata.channel } : {}),
            ...(metadata?.thumbnail ? { thumbnail: metadata.thumbnail } : {}),
          },
        })}
      >
        {metadata?.thumbnail ? (
          <Image source={{ uri: metadata.thumbnail }} style={s.videoThumb} contentFit="cover" />
        ) : (
          <View style={[s.videoThumb, s.missingThumb]}>
            <Ionicons name="logo-youtube" size={20} color={C.dim} />
          </View>
        )}
        <View style={s.videoCopy}>
          <Text style={s.videoTitle} numberOfLines={2}>
            {metadata?.title ?? `Video ${videoId}`}
          </Text>
          {!!metadata?.channel && <Text style={s.videoMeta} numberOfLines={1}>{metadata.channel}</Text>}
        </View>
      </TouchableOpacity>
      {onRemove && (
        <TouchableOpacity
          style={s.removeButton}
          onPress={onRemove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Remove video"
        >
          <Ionicons name="close-circle-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyState({ icon, title, detail }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; detail: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={42} color={C.dim} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{detail}</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const {
    playlists, likedVideoIds, savedVideoIds, history, videoCatalog, isHydrated,
    createPlaylist, addVideoToPlaylist, removeVideoFromPlaylist, deletePlaylist,
    toggleLike, toggleSave,
  } = useAppContext();
  const [tab, setTab] = useState<LibraryTab>('saved');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const selectedPlaylist = playlists.find(item => item.id === selectedPlaylistId) ?? null;

  useEffect(() => {
    if (isLibraryTab(requestedTab)) setTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    if (selectedPlaylistId && !selectedPlaylist) setSelectedPlaylistId(null);
  }, [selectedPlaylistId, selectedPlaylist]);

  const historyById = useMemo(
    () => new Map(history.map(item => [item.videoId, item])),
    [history],
  );

  const openCreate = () => {
    setTab('playlists');
    setSelectedPlaylistId(null);
    setPlaylistName('');
    setCreateOpen(true);
  };

  const submitPlaylist = () => {
    const newId = createPlaylist(playlistName);
    if (!newId) return;
    setPlaylistName('');
    setCreateOpen(false);
    setSelectedPlaylistId(newId);
  };

  const confirmDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete playlist?',
      'This removes the local playlist only. It does not delete your watch history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlist.id);
            setSelectedPlaylistId(null);
          },
        },
      ],
    );
  };

  const renderVideoIds = tab === 'history'
    ? history.map(item => item.videoId)
    : tab === 'liked'
      ? likedVideoIds
      : savedVideoIds;
  const visibleVideoIds = [...renderVideoIds].reverse();

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        {selectedPlaylist ? (
          <>
            <TouchableOpacity
              style={s.headerIcon}
              onPress={() => setSelectedPlaylistId(null)}
              accessibilityRole="button"
              accessibilityLabel="Back to playlists"
            >
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={s.headerTitle} numberOfLines={1}>{selectedPlaylist.name}</Text>
            <TouchableOpacity
              style={s.headerIcon}
              onPress={() => confirmDeletePlaylist(selectedPlaylist)}
              accessibilityRole="button"
              accessibilityLabel="Delete playlist"
            >
              <Ionicons name="trash-outline" size={21} color={C.muted} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.logo}>Library</Text>
            <TouchableOpacity
              style={s.headerIcon}
              onPress={openCreate}
              accessibilityRole="button"
              accessibilityLabel="Create playlist"
            >
              <Ionicons name="add-circle-outline" size={26} color={C.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {!selectedPlaylist && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabRow}
        >
          {TABS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[s.tabBtn, tab === item.key && s.tabBtnActive]}
              onPress={() => {
                setSelectedPlaylistId(null);
                setTab(item.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item.key }}
            >
              <Text style={[s.tabLabel, tab === item.key && s.tabLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {!isHydrated ? (
          <View style={s.loading}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : selectedPlaylist ? (
          selectedPlaylist.videoIds.length === 0 ? (
            <EmptyState
              icon="list-outline"
              title="This playlist is empty"
              detail="Open a video, choose Playlist, and add it here."
            />
          ) : (
            selectedPlaylist.videoIds.map(videoId => (
              <LocalVideoRow
                key={videoId}
                videoId={videoId}
                metadata={videoCatalog[videoId] ?? historyById.get(videoId)}
                onRemove={() => removeVideoFromPlaylist(selectedPlaylist.id, videoId)}
              />
            ))
          )
        ) : tab === 'offline' ? (
          <EmptyState
            icon="cloud-download-outline"
            title="Offline media is unavailable"
            detail="Vyde does not download YouTube videos. Use YouTube’s official offline feature where it is available."
          />
        ) : tab === 'playlists' ? (
          playlists.length === 0 ? (
            <EmptyState
              icon="list-outline"
              title="No local playlists yet"
              detail="Create a Vyde playlist to organize videos on this device."
            />
          ) : (
            playlists.map(playlist => (
              <TouchableOpacity
                key={playlist.id}
                style={s.playlistRow}
                activeOpacity={0.8}
                onPress={() => setSelectedPlaylistId(playlist.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${playlist.name}, ${playlist.videoIds.length} videos`}
              >
                <View style={s.playlistIcon}>
                  <Ionicons name="lock-closed" size={20} color={C.accent} />
                </View>
                <View style={s.playlistCopy}>
                  <Text style={s.playlistName}>{playlist.name}</Text>
                  <Text style={s.videoMeta}>{playlist.videoIds.length} videos · Private to this device</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.dim} />
              </TouchableOpacity>
            ))
          )
        ) : visibleVideoIds.length === 0 ? (
          <EmptyState
            icon={tab === 'history' ? 'time-outline' : tab === 'liked' ? 'heart-outline' : 'bookmark-outline'}
            title={tab === 'history' ? 'No watch history yet' : tab === 'liked' ? 'No liked videos yet' : 'No saved videos yet'}
            detail={tab === 'history'
              ? 'Videos you open will appear here.'
              : 'Use the Like or Save action on a video to keep it in this library.'}
          />
        ) : (
          visibleVideoIds.map(videoId => (
            <LocalVideoRow
              key={videoId}
              videoId={videoId}
              metadata={videoCatalog[videoId] ?? historyById.get(videoId)}
              onRemove={tab === 'history' ? undefined : () => tab === 'liked' ? toggleLike(videoId) : toggleSave(videoId)}
            />
          ))
        )}

        {isHydrated && !selectedPlaylist && tab === 'playlists' && (
          <TouchableOpacity style={s.newPlaylist} onPress={openCreate} accessibilityRole="button">
            <Ionicons name="add" size={18} color={C.accent} />
            <Text style={s.newPlaylistText}>New playlist</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateOpen(false)}
      >
        <KeyboardAvoidingView
          style={s.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[s.modalCard, { marginBottom: Math.max(insets.bottom, 16) }]}>
            <View style={s.modalHeading}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>New local playlist</Text>
                <Text style={s.modalDescription}>Stored on this device; not synced to YouTube.</Text>
              </View>
              <TouchableOpacity
                onPress={() => { setCreateOpen(false); setPlaylistName(''); }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>
            <TextInput
              autoFocus
              value={playlistName}
              onChangeText={setPlaylistName}
              placeholder="Playlist name"
              placeholderTextColor={C.dim}
              maxLength={60}
              style={s.playlistInput}
              returnKeyType="done"
              onSubmitEditing={submitPlaylist}
              accessibilityLabel="Playlist name"
            />
            <TouchableOpacity
              style={[s.createButton, !playlistName.trim() && s.createButtonDisabled]}
              onPress={submitPlaylist}
              disabled={!playlistName.trim()}
              accessibilityRole="button"
            >
              <Text style={s.createButtonText}>Create playlist</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  logo: { color: C.text, fontSize: 24, fontFamily: 'Outfit_700Bold', letterSpacing: -0.5 },
  headerTitle: { flex: 1, color: C.text, fontSize: 17, textAlign: 'center', fontFamily: 'Outfit_700Bold' },
  headerIcon: { minWidth: 36, alignItems: 'center', justifyContent: 'center', padding: 4 },
  tabRow: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6, gap: 8 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: C.hover, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderLight,
  },
  tabBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabLabel: { color: C.muted, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  tabLabelActive: { color: '#fff' },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 110, flexGrow: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 28, gap: 10 },
  emptyTitle: { color: C.text, fontSize: 17, textAlign: 'center', fontFamily: 'Outfit_700Bold' },
  emptyBody: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  playlistRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  playlistIcon: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.borderLight, alignItems: 'center', justifyContent: 'center',
  },
  playlistCopy: { flex: 1 },
  playlistName: { color: C.text, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  videoMeta: { color: C.dim, fontSize: 11, marginTop: 4 },
  videoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  videoMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 62 },
  videoThumb: { width: 104, height: 58, borderRadius: 7, backgroundColor: C.elevated },
  missingThumb: { alignItems: 'center', justifyContent: 'center' },
  videoCopy: { flex: 1 },
  videoTitle: { color: C.text, fontSize: 13, lineHeight: 18, fontFamily: 'Outfit_600SemiBold' },
  removeButton: { padding: 8 },
  newPlaylist: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 16, marginTop: 4 },
  newPlaylistText: { color: C.accent, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.72)', padding: 24 },
  modalCard: { backgroundColor: C.elevated, borderRadius: 16, borderWidth: 1, borderColor: C.borderLight, padding: 18, gap: 16 },
  modalHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalTitle: { color: C.text, fontSize: 18, fontFamily: 'Outfit_700Bold' },
  modalDescription: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  playlistInput: {
    color: C.text, backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderLight,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  createButton: { backgroundColor: C.accent, borderRadius: 22, alignItems: 'center', paddingVertical: 12 },
  createButtonDisabled: { opacity: 0.45 },
  createButtonText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_700Bold' },
});
