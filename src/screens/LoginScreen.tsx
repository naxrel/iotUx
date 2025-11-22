import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Button } from '../components/common/Button';
import { authAPI } from '../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, getThemedColors } from '../constants/theme';
import { NetworkService } from '../utils/network-utils';
import { AuroraWaves } from '../components/common/AuroraWaves';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const themedColors = getThemedColors(isDark);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribe(setIsOnline);
    return unsubscribe;
  }, []);
  
  const clearAuthData = async () => {
    await authAPI.logout();
    Alert.alert('Success', 'Auth data cleared. You can now login fresh.');
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    
    // Check internet connection first
    const online = await NetworkService.checkConnection();
    if (!online) {
      const message = 'No internet connection. Please check your network and try again.';
      setError(message);
      Alert.alert(
        '📡 No Internet',
        message,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const userData = await authAPI.login(email.trim(), password);
        console.log('Login successful:', userData);
      } else {
        const userData = await authAPI.register(name.trim(), email.trim(), password);
        console.log('Registration successful:', userData);
      }
      
      // Navigate to dashboard after successful auth
      router.replace('/(tabs)/devices');
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // Better error messages based on error type
      let errorMessage = '';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet and try again.';
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = err.response?.data?.detail || 
                      err.response?.data?.message ||
                      err.message ||
                      (isLogin ? 'Login failed. Please check your credentials.' : 'Registration failed. Please try again.');
      }
      
      setError(errorMessage);
      
      // Show alert on mobile
      if (Platform.OS !== 'web') {
        Alert.alert(
          isLogin ? '❌ Login Failed' : '❌ Registration Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Aurora Waves Background - only in dark mode */}
      {isDark && <AuroraWaves />}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/icon2.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: themedColors.text }]}>TRACKTARD</Text>
            <Text style={[styles.subtitle, { color: themedColors.textSecondary }]}>Protect Your Vehicle</Text>
          </View>

          {/* Glassmorphism Card */}
          <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.glassCard}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.02)']
              }
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                {/* Toggle Login/Register */}
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
                    onPress={() => setIsLogin(true)}
                  >
                    <Text style={[styles.toggleText, { color: themedColors.textSecondary }, isLogin && styles.toggleTextActive]}>
                      Login
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
                    onPress={() => setIsLogin(false)}
                  >
                    <Text style={[styles.toggleText, { color: themedColors.textSecondary }, !isLogin && styles.toggleTextActive]}>
                      Register
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  {!isLogin && (
                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: themedColors.text }]}>Name</Text>
                      <TextInput
                        style={[styles.input, {
                          color: themedColors.text,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
                        }]}
                        placeholder="Your name"
                        placeholderTextColor={themedColors.textTertiary}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themedColors.text }]}>Email</Text>
                    <TextInput
                      style={[styles.input, {
                        color: themedColors.text,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
                      }]}
                      placeholder="you@example.com"
                      placeholderTextColor={themedColors.textTertiary}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: themedColors.text }]}>Password</Text>
                    <TextInput
                      style={[styles.input, {
                        color: themedColors.text,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
                      }]}
                      placeholder="••••••••"
                      placeholderTextColor={themedColors.textTertiary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  {error ? <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text> : null}

                  <Button
                    title={isLogin ? 'Sign In' : 'Create Account'}
                    onPress={handleSubmit}
                    loading={loading}
                    size="large"
                    style={styles.submitButton}
                  />
                  
                  {/* Copyright Footer */}
                  <View style={styles.footerContainer}>
                    <Text style={styles.copyrightText}>© 2025 Tracktard</Text>
                    <Text style={styles.copyrightSubtext}>All rights reserved</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray300,
  },
  glassCard: {
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: BORDER_RADIUS.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardContent: {
    padding: SPACING.xl,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs / 2,
    marginBottom: SPACING.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray400,
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  form: {
    gap: SPACING.md,
  },
  inputContainer: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  footerContainer: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  copyrightText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  copyrightSubtext: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: FONT_SIZES.xs,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: SPACING.md,
  },
});
