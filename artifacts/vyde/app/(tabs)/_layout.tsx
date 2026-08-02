import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#E84A27';
const DIM    = '#666675';
const BG     = '#050507';
const BORDER = '#1F1F2E';
const TAB_H  = 50;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, active: IoniconsName, inactive: IoniconsName) {
  return ({ color }: { color: string }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color} />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: DIM,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: BORDER,
          height: TAB_H + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Outfit_500Medium',
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) =>
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) =>
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) =>
            <Ionicons name={focused ? 'library' : 'library-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) =>
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
