import React from 'react';
import { View, type ReactNode } from 'react-native';

export const PerpsStub = () => <View testID="perps-inplace-screen" />;

export const SwapStub = () => <View testID="swap-inplace-screen" />;

export const PredictionsStub = () => (
  <View testID="predictions-inplace-screen" />
);

export const CollectiblesStub = () => (
  <View testID="collectibles-inplace-screen" />
);

export const SurfaceStub = ({ children }: { children?: ReactNode }) => (
  <View>{children}</View>
);
