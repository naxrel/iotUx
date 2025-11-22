export const COLORS = {
  // Deep, rich background for that "Liquid" feel (Dark Mode)
  background: '#000000', 
  backgroundDeep: '#050511',
  
  // Light mode backgrounds
  backgroundLight: '#FFFFFF',
  backgroundLightSecondary: '#F9FAFB',
  
  // Primary - Electric Indigo & Neon accents
  primary: '#6366F1', 
  primaryGradient: ['#6366F1', '#8B5CF6'], // Indigo to Purple
  secondary: '#06B6D4', // Cyan
  accent: '#EC4899', // Pink
  
  // Status
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  
  // Online/Offline indicators
  online: '#34D399',
  offline: '#6B7280',
  
  // Text
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black: '#000000',
  
  // Glassmorphism Constants - Dark
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassSurface: 'rgba(255, 255, 255, 0.05)',
  glassHighlight: 'rgba(255, 255, 255, 0.1)',
  
  // Glassmorphism Constants - Light
  glassBorderLight: 'rgba(0, 0, 0, 0.1)',
  glassSurfaceLight: 'rgba(255, 255, 255, 0.7)',
  glassHighlightLight: 'rgba(255, 255, 255, 0.9)',
  
  // Legacy support
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  info: '#3B82F6',
  
  // Bubble colors for login animation
  bubble1: 'rgba(99, 102, 241, 0.3)', // Indigo
  bubble2: 'rgba(139, 92, 246, 0.3)', // Purple
  bubble3: 'rgba(59, 130, 246, 0.3)', // Blue
  bubble4: 'rgba(16, 185, 129, 0.3)', // Green
  bubble5: 'rgba(245, 158, 11, 0.3)', // Amber
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const API_BASE_URL = 'https://iot.fyuko.app';

// Helper function to get theme-aware colors
export const getThemedColors = (isDark: boolean) => ({
  background: isDark ? COLORS.background : COLORS.backgroundLight,
  backgroundSecondary: isDark ? COLORS.backgroundDeep : COLORS.backgroundLightSecondary,
  text: isDark ? COLORS.white : COLORS.gray900,
  textSecondary: isDark ? COLORS.gray400 : COLORS.gray600,
  textTertiary: isDark ? COLORS.gray500 : COLORS.gray500,
  border: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
  surface: isDark ? COLORS.glassSurface : COLORS.glassSurfaceLight,
  cardBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
});
