import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { BORDER_RADIUS, COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderless?: boolean;
}

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  style,
  intensity = 30,
  tint,
  borderless = false,
}) => {
  const { isDark } = useTheme();
  const isAndroid = Platform.OS === 'android';
  
  // Auto-detect tint based on theme if not specified
  const effectiveTint = tint || (isDark ? 'dark' : 'light');
  
  // Adjust colors based on theme
  const borderColors = isDark 
    ? [COLORS.glassBorder, 'rgba(255,255,255,0.02)']
    : [COLORS.glassBorderLight, 'rgba(0,0,0,0.02)'];
    
  const surfaceColor = isDark ? COLORS.glassSurface : COLORS.glassSurfaceLight;
  const fallbackBg = isDark ? 'rgba(20,20,30,0.7)' : 'rgba(255,255,255,0.85)';

  return (
    <View style={[styles.container, { backgroundColor: isAndroid ? fallbackBg : 'transparent' }, style]}>
      <BlurView 
        intensity={isAndroid ? intensity + 20 : intensity} 
        tint={effectiveTint} 
        style={StyleSheet.absoluteFill} 
      />
      
      {!borderless && (
        <LinearGradient
          colors={borderColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      
      <View style={[styles.innerShine, { backgroundColor: surfaceColor }]} />
      
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.lg,
  },
  innerShine: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  content: {
    zIndex: 1,
  },
});
