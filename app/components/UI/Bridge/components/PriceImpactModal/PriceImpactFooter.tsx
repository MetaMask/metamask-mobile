import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { PriceImpactModalType } from './constants';

export interface PriceImpactFooterProps {
  type: PriceImpactModalType;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function PriceImpactFooter({
  type,
  onConfirm,
  onCancel,
  loading,
}: PriceImpactFooterProps) {
  if (type === PriceImpactModalType.Execution) {
    return (
      <Box padding={4} flexDirection={BoxFlexDirection.Row} gap={3}>
        <Box twClassName="flex-1">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={onCancel}
            isFullWidth
            isLoading={loading}
            disabled={loading}
          >
            {strings('bridge.proceed')}
          </Button>
        </Box>
        <Box twClassName="flex-1">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={onConfirm}
            isFullWidth
            isLoading={loading}
            disabled={loading}
          >
            {strings('bridge.cancel')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={4}>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onConfirm}
        isFullWidth
      >
        {strings('bridge.got_it')}
      </Button>
    </Box>
  );
}
