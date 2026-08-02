import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Video } from '@/data/mockData';

interface Props {
  video: Video;
  progress?: number;
}

const C = {
  bg: '#050507',
  elevated: '#0C0C12',
  text: '#FFFFFF',
  muted: '#9999A6',
  dim: '#666675',
  border: '#1F1F2E',
  accent: '#E84A27',
};

export default function VideoCard({ video, progress }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push({ pathname: '/player', params: { id: video.id } })}
      style={styles.container}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        <Image source={video.thumbnail} style={styles.thumb} contentFit="cover" />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
        {progress !== undefined && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
          </View>
        )}
      </View>

      {/* Metadata row */}
      <View style={styles.meta}>
        <View style={[styles.avatar, { backgroundColor: video.channelColor }]}>
          <Text style={styles.avatarText}>{video.channelInitials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
          <View style={styles.channelRow}>
            <Text style={styles.channel}>{video.channel}</Text>
            {video.verified && (
              <Ionicons name="checkmark-circle" size={13} color={C.dim} style={{ marginLeft: 3 }} />
            )}
          </View>
          <Text style={styles.stats}>{video.views} views · {video.timestamp}</Text>
        </View>
        <TouchableOpacity hitSlop={12} style={styles.moreBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color={C.dim} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 28 },
  thumbWrap: {
    width: '100%', aspectRatio: 16 / 9,
    backgroundColor: '#111', overflow: 'hidden', position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  durationBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '600', fontFamily: 'Outfit_600SemiBold' },
  progressTrack: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  progressFill: { height: 3, backgroundColor: C.accent },
  meta: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  info: { flex: 1 },
  title: { color: C.text, fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 3, fontFamily: 'Outfit_600SemiBold' },
  channelRow: { flexDirection: 'row', alignItems: 'center' },
  channel: { color: C.muted, fontSize: 12 },
  stats: { color: C.dim, fontSize: 12, marginTop: 1 },
  moreBtn: { paddingLeft: 4, paddingTop: 2 },
});
