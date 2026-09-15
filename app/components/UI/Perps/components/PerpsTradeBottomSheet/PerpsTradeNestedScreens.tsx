import type { OrderType } from '@metamask/perps-controller';
import React from 'react';
import { PayWithScreenContent } from '../../../../Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet';
import PerpsLeverageBottomSheet from '../PerpsLeverageBottomSheet';
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

export const PerpsTradePayWithScreen: React.FC = () => {
  const { close, goBack } = usePerpsTradeSheet();
  return <PayWithScreenContent onBack={goBack} onClose={close} />;
};
