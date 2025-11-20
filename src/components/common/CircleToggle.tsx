import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT_SIZES, SHADOWS, SPACING } from '../../constants/theme';

interface CircleToggleProps {
  isArmed: boolean;
  onToggle: (newState: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: number;
}

export const CircleToggle: React.FC<CircleToggleProps> = ({
  isArmed,
  onToggle,
  disabled = false,
  loading = false,
  size = 140,
}) => {
  const handlePress = () => {
    if (!disabled && !loading) {
      onToggle(!isArmed);
    }
  };

  const backgroundColor = disabled
    ? COLORS.gray300
    : isArmed
    ? COLORS.danger
    : COLORS.success;

  const borderColor = disabled
    ? COLORS.gray400
    : isArmed
    ? '#dc2626'
    : '#059669';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            borderColor,
            opacity: disabled ? 0.5 : 1,
          },
          !disabled && SHADOWS.large,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.white} />
        ) : (
          <>
            <Text style={[styles.icon, { fontSize: size * 0.3 }]}>
              {isArmed ? '🔒' : '🔓'}
            </Text>
            <Text style={[styles.label, { fontSize: size * 0.14 }]}>
              {isArmed ? 'ARMED' : 'DISARMED'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      <Text style={[styles.helpText, disabled && styles.disabledText]}>
        {disabled
          ? 'Device offline'
          : loading
          ? 'Sending command...'
          : 'Tap to toggle'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  icon: {
    marginBottom: SPACING.xs,
  },
  label: {
    color: COLORS.white,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  helpText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  disabledText: {
    color: COLORS.gray400,
  },
});
