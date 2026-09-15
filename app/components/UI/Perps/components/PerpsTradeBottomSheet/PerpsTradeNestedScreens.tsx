import type { OrderType } from '@metamask/perps-controller';
import { NavigationContext, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef } from 'react';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { PayWithScreenContent } from '../../../../Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet';
import { useDismissOnPaymentChange } from '../../../../Views/confirmations/hooks/pay/useDismissOnPaymentChange';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
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

export const PerpsTradePayWithScreen: React.FC = () => {
  const { close, goBack } = usePerpsTradeSheet();
  const navigation = useNavigation<AppNavigationProp>();
  const { payToken } = useTransactionPayToken();
  const payTokenKey = payToken
    ? `${payToken.chainId.toLowerCase()}:${payToken.address.toLowerCase()}`
    : undefined;
  const latestPayTokenKeyRef = useRef(payTokenKey);
  const payTokenBeforeBlurRef = useRef(payTokenKey);
  const isReturningFromChildRouteRef = useRef(false);
  const nestedNavigation = useMemo(
    () => Object.assign({}, navigation, { goBack }),
    [goBack, navigation],
  );

  useEffect(() => {
    latestPayTokenKeyRef.current = payTokenKey;
  }, [payTokenKey]);

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      payTokenBeforeBlurRef.current = latestPayTokenKeyRef.current;
      isReturningFromChildRouteRef.current = true;
    });
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (
        isReturningFromChildRouteRef.current &&
        payTokenBeforeBlurRef.current !== latestPayTokenKeyRef.current
      ) {
        goBack();
      }
      isReturningFromChildRouteRef.current = false;
    });

    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [goBack, navigation]);

  useDismissOnPaymentChange({
    dismissOnPayTokenChange: false,
    onDismiss: goBack,
  });

  return (
    <NavigationContext.Provider
      value={
        nestedNavigation as unknown as React.ContextType<
          typeof NavigationContext
        >
      }
    >
      <PayWithScreenContent onBack={goBack} onClose={close} />
    </NavigationContext.Provider>
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
