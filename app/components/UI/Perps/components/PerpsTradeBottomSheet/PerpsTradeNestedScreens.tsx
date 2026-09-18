import type { OrderType } from '@metamask/perps-controller';
import React from 'react';
import PerpsLeverageBottomSheet from '../PerpsLeverageBottomSheet';
import { usePerpsTradeSheet } from './PerpsTradeBottomSheet';
export { default as PerpsTradeSettingsScreen } from './PerpsTradeSettingsScreen';

interface PerpsTradeLeverageScreenProps {
  onConfirm: (leverage: number, inputMethod?: 'slider' | 'preset') => void;
  leverage: number;
  minLeverage: number;
  maxLeverage: number;
  currentPrice: number;
  direction: 'long' | 'short';
  asset: string;
  limitPrice?: string;
  orderType: OrderType;
}

export const PerpsTradeLeverageScreen: React.FC<
  PerpsTradeLeverageScreenProps
> = (props) => {
  const { close, goBack } = usePerpsTradeSheet();
  return (
    <PerpsLeverageBottomSheet
      {...props}
      isVisible
      presentation="screen"
      onBack={goBack}
      onClose={close}
      onConfirmComplete={goBack}
    />
  );
};
