import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#050507', elevated: '#0C0C12',
  text: '#FFFFFF', muted: '#9999A6', dim: '#666675',
  accent: '#E84A27', border: '#1F1F2E', borderLight: '#2A2A3D',
};

const FEATURES = [
  { icon: 'sparkles-outline',          label: 'Personalised local discovery' },
  { icon: 'bookmark-outline',          label: 'Keep playlists on this device' },
  { icon: 'cloud-download-outline',    label: 'Save local download metadata' },
  { icon: 'notifications-outline',     label: 'Official account sync coming soon' },
  { icon: 'hand-left-outline',         label: 'Gesture controls for brightness & volume' },
];

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await new Promise(r => setTimeout(r, 350));
    await signIn();
    setLoading(false);
    router.back();
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <LinearGradient
      colors={['#0A0005', '#050507', '#050507']}
      style={[s.root, { paddingTop: topPad, paddingBottom: botPad + 24 }]}
    >
      {/* Close */}
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()} hitSlop={14}>
        <Ionicons name="close" size={24} color={C.muted} />
      </TouchableOpacity>

      {/* Logo mark */}
      <View style={s.logoWrap}>
        <LinearGradient colors={[C.accent, '#FF5A36']} style={s.logoCircle}>
          <Text style={s.logoV}>V</Text>
        </LinearGradient>
        <Text style={s.logoText}>vyde</Text>
        <Text style={s.tagline}>Your local YouTube companion</Text>
      </View>

      {/* Feature list */}
      <View style={s.features}>
        {FEATURES.map(f => (
          <View key={f.label} style={s.feature}>
            <View style={s.featureIconWrap}>
              <Ionicons name={f.icon as any} size={18} color={C.accent} />
            </View>
            <Text style={s.featureText}>{f.label}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={s.ctaBlock}>
        <TouchableOpacity
          style={[s.googleBtn, loading && { opacity: 0.7 }]}
          onPress={handleSignIn}
          activeOpacity={0.88}
          disabled={loading}
        >
          {loading ? (
            <Text style={s.googleBtnText}>Signing in…</Text>
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={s.googleBtnText}>Continue in local mode</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={() => router.back()}>
          <Text style={s.skipText}>Continue without signing in</Text>
        </TouchableOpacity>

        <Text style={s.consent}>
          Local mode stores Vyde data on this device. Official Google/YouTube account sync will be added separately.
        </Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, backgroundColor: C.bg },
  closeBtn: { alignSelf: 'flex-end', padding: 8, marginTop: 4 },
  logoWrap: { alignItems: 'center', marginTop: 24, marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoV: { color: '#fff', fontSize: 44, fontFamily: 'Outfit_700Bold', lineHeight: 52 },
  logoText: { color: C.text, fontSize: 36, fontFamily: 'Outfit_700Bold', letterSpacing: -1.5, marginBottom: 6 },
  tagline: { color: C.muted, fontSize: 15 },
  features: { gap: 14, marginBottom: 40 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1a0800', borderWidth: 1, borderColor: '#3a1500',
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { color: C.muted, fontSize: 14, flex: 1 },
  ctaBlock: { gap: 0 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: C.accent, paddingVertical: 16, borderRadius: 16, marginBottom: 12,
  },
  googleBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_700Bold' },
  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { color: C.muted, fontSize: 15, fontFamily: 'Outfit_500Medium' },
  consent: { color: C.dim, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 16, paddingHorizontal: 16 },
  consentLink: { color: C.muted, textDecorationLine: 'underline' },
});
