import React from 'react';
import { ViewStyle } from 'react-native';
import { SPACING } from '../../constants/theme';
import { GlassView } from './GlassView';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  variant?: 'default' | 'featured';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  padding = SPACING.md,
  variant = 'default'
}) => {
  return (
    <GlassView 
      intensity={variant === 'featured' ? 45 : 25}
      style={[{ padding, marginVertical: SPACING.xs }, style]}
    >
      {children}
    </GlassView>
  );
};
