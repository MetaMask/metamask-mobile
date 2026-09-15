import React from 'react';
import {
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { useBridgeSession } from '../../hooks/useBridgeSession';

interface Props {
  loading?: boolean;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  label: string;
}

export const SwapsLimitOrderConfirmButton = ({
  loading,
  onPress,
  testID,
  disabled,
  label,
}: Props) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const { latestSourceBalance } = useBridgeSession();

  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const isDisabled = Boolean(disabled || hasInsufficientBalance);

  return (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonBaseSize.Lg}
      isLoading={Boolean(loading)}
      onPress={onPress}
      isFullWidth
      testID={testID}
      isDisabled={isDisabled}
    >
      {label}
    </Button>
  );
};
