import type { OrderType } from '@metamask/perps-controller';
import React from 'react';
import PerpsLeverageBottomSheet from '../PerpsLeverageBottomSheet';
import PerpsSlippageBottomSheet from '../PerpsSlippageBottomSheet';
import { usePerpsTradeSheet } from './PerpsTradeBottomSheet';

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

interface PerpsTradeSettingsScreenProps {
  currentValueBps: number;
  onSave: (valueBps: number) => void;
}

export const PerpsTradeSettingsScreen: React.FC<
  PerpsTradeSettingsScreenProps
> = ({ currentValueBps, onSave }) => {
  const { close, goBack } = usePerpsTradeSheet();

  return (
    <PerpsSlippageBottomSheet
      isVisible
      currentValueBps={currentValueBps}
      presentation="screen"
      onBack={goBack}
      onClose={close}
      onSave={onSave}
      onSaveComplete={goBack}
    />
  );
};
