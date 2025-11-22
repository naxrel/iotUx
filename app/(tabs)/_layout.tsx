import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { COLORS, FONT_SIZES, getThemedColors } from '../../src/constants/theme';
import { authAPI } from '../../src/services/api';
import { useTheme } from '../../src/contexts/ThemeContext';

function TabIcon({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 24 }}>{icon}</Text>;
}

export default function TabLayout() {
  const router = useRouter();
  const { isDark } = useTheme();
  const themedColors = getThemedColors(isDark);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ok = await authAPI.isAuthenticated();
        if (mounted && !ok) {
          router.replace('/');
        }
      } catch {
        if (mounted) router.replace('/');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: isDark ? COLORS.gray400 : COLORS.gray600,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(20, 20, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 1,
          borderTopColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          position: 'absolute',
          backdropFilter: 'blur(10px)',
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZES.xs,
          fontWeight: '600',
          color: themedColors.text,
        },
      }}
    >
      {/* Hidden home tab - redirect to dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      
      {/* Main devices/dashboard tab */}
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Dashboard',
          tabBarIcon: () => <TabIcon icon="📊" />,
        }}
      />
      
      {/* Settings tab */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: () => <TabIcon icon="⚙️" />,
        }}
      />
      
      {/* Hide explore tab */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}