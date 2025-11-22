import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'glass';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const getColors = () => {
    if (disabled) return ['#4B5563', '#374151'];
    switch (variant) {
      case 'primary': return COLORS.primaryGradient;
      case 'secondary': return [COLORS.secondary, '#0891b2'];
      case 'danger': return ['#EF4444', '#B91C1C'];
      case 'glass': return ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)'];
      default: return ['transparent', 'transparent'];
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={getColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient, 
          variant === 'outline' && styles.outline
        ]}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[
            styles.text, 
            variant === 'outline' && styles.outlineText,
            disabled && styles.disabledText
          ]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  text: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  outlineText: {
    color: COLORS.white,
  },
  disabledText: {
    color: COLORS.gray400,
  }
});
