import { useRouter } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../components/common/Card';
import { AuroraWaves } from '../components/common/AuroraWaves';
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING, getThemedColors } from '../constants/theme';
import { ThemeMode, useTheme } from '../contexts/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const themedColors = getThemedColors(isDark);

  const themeOptions: { mode: ThemeMode; label: string; icon: string; description: string }[] = [
    { mode: 'auto', label: 'Auto', icon: '🌓', description: 'Match system settings' },
    { mode: 'light', label: 'Light', icon: '☀️', description: 'Always use light mode' },
    { mode: 'dark', label: 'Dark', icon: '🌙', description: 'Always use dark mode' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background }]}>
      <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Background Layer - only in dark mode */}
      {isDark && (
        <View style={StyleSheet.absoluteFill}>
          <AuroraWaves />
        </View>
      )}

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.backButton, { color: themedColors.text }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: themedColors.text }]}>Settings</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Theme Section */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themedColors.text }]}>Appearance</Text>
            <Text style={[styles.sectionSubtitle, { color: themedColors.textSecondary }]}>Choose how the app looks</Text>

            <View style={styles.optionsContainer}>
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderColor: themeMode === option.mode ? COLORS.primary : 'transparent',
                    },
                    themeMode === option.mode && styles.optionCardActive,
                  ]}
                  onPress={() => setThemeMode(option.mode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, { color: themedColors.text }]}>{option.label}</Text>
                    <Text style={[styles.optionDescription, { color: themedColors.textSecondary }]}>{option.description}</Text>
                  </View>
                  {themeMode === option.mode && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* App Info */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themedColors.text }]}>About</Text>
            <View style={[styles.infoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.infoLabel, { color: themedColors.textSecondary }]}>Version</Text>
              <Text style={[styles.infoValue, { color: themedColors.text }]}>1.0.0</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.infoLabel, { color: themedColors.textSecondary }]}>Theme</Text>
              <Text style={[styles.infoValue, { color: themedColors.text }]}>
                {themeMode === 'auto' ? `Auto (${isDark ? 'Dark' : 'Light'})` : themeMode}
              </Text>
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  backButton: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
    width: 60,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
    marginBottom: SPACING.lg,
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.xs / 2,
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
  },
  checkmark: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray200,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
  },
});
