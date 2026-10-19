import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
  type SwapsLimitOrderExpirationMinutes,
} from '../../constants/limitOrders';
import SwapsLimitOrderExpirationModal from './SwapsLimitOrderExpirationModal';
import type { SwapsLimitOrderExpirationModalParams } from './types';

export const SwapsLimitOrderExpirationModalScreen = () => {
  const { goBack } = useNavigation<AppNavigationProp>();
  const { selectedMinutes: initialMinutes, onSelect } =
    useParams<SwapsLimitOrderExpirationModalParams>();
  const [selectedMinutes, setSelectedMinutes] =
    useState<SwapsLimitOrderExpirationMinutes>(
      initialMinutes ?? SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
    );

  const handleSelect = useCallback(
    (minutes: SwapsLimitOrderExpirationMinutes) => {
      setSelectedMinutes(minutes);
      onSelect(minutes);
    },
    [onSelect],
  );

  return (
    <SwapsLimitOrderExpirationModal
      selectedMinutes={selectedMinutes}
      onSelect={handleSelect}
      goBack={goBack}
    />
  );
};
