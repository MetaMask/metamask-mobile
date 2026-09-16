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
import type { useLatestBalance } from '../../hooks/useLatestBalance';

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
}: Props) => (
  <Button
    variant={ButtonVariant.Primary}
    size={ButtonBaseSize.Lg}
    isLoading={Boolean(loading)}
    onPress={onPress}
    isFullWidth
    testID={testID}
    isDisabled={disabled}
  >
    {label}
  </Button>
);
