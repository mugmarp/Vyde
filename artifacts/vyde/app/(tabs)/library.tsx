import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';

const C = {
  bg: '#050507', elevated: '#0C0C12', hover: '#161620',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { playlists, createPlaylist } = useAppContext();
  const [tab, setTab] = useState<'downloads' | 'playlists'>('downloads');
  const [createOpen, setCreateOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const submitPlaylist = () => {
    createPlaylist(playlistName);
    setPlaylistName('');
    setCreateOpen(false);
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <Text style={s.logo}>vyde</Text>
        <TouchableOpacity hitSlop={10} onPress={() => { setTab('playlists'); setCreateOpen(true); }}>
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
          <View style={s.empty}>
            <Ionicons name="cloud-download-outline" size={44} color={C.dim} />
            <Text style={s.emptyTitle}>Offline media unavailable</Text>
            <Text style={s.emptyBody}>Vyde does not download YouTube videos. Use YouTube’s official offline feature where it is available.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 14, paddingTop: 16 }}>
            {playlists.map(pl => (
              <View key={pl.id} style={s.plRow}>
                <View style={s.plIcon}>
                  <Ionicons name={pl.isPrivate ? 'lock-closed' : 'list'} size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.plName}>{pl.name}</Text>
                  <Text style={s.plMeta}>{pl.count} videos{pl.isPrivate ? ' · Private' : ''}</Text>
                </View>
              </View>
            ))}
            {playlists.length === 0 && (
              <View style={s.empty}>
                <Ionicons name="list-outline" size={44} color={C.dim} />
                <Text style={s.emptyTitle}>No local playlists yet</Text>
                <Text style={s.emptyBody}>Create a Vyde playlist to organize videos on this device.</Text>
              </View>
            )}
            <TouchableOpacity style={s.newPlaylist} onPress={() => setCreateOpen(true)}>
              <Ionicons name="add" size={18} color={C.accent} />
              <Text style={s.newPlaylistText}>New playlist</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.emptyTitle}>New local playlist</Text>
            <Text style={s.emptyBody}>This list is stored on this device and is not synced to YouTube.</Text>
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
            />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => { setCreateOpen(false); setPlaylistName(''); }}>
                <Text style={s.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalCreate} onPress={submitPlaylist} disabled={!playlistName.trim()}>
                <Text style={s.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: C.elevated, borderRadius: 16, borderWidth: 1, borderColor: C.borderLight, padding: 20, gap: 14 },
  playlistInput: { color: C.text, backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, marginTop: 4 },
  modalCancel: { color: C.muted, fontSize: 14 },
  modalCreate: { backgroundColor: C.accent, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 9 },
  modalCreateText: { color: '#fff', fontSize: 14, fontFamily: 'Outfit_700Bold' },
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
