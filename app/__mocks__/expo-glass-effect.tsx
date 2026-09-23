import React from 'react';
import { View, type ViewProps } from 'react-native';

export type GlassColorScheme = 'auto' | 'light' | 'dark';

export const GlassView = (props: ViewProps) => <View {...props} />;

export const isLiquidGlassAvailable = (): boolean => false;
