import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MAX_MULTIPACK_COUNT } from '../../providers/pack-partner/constants';

/** Quick-buy presets from Replit, bounded by the same limit as the provider. */
export default function PackQuantityPresets({
  quantity,
  maximumAffordable,
  disabled,
  onChange,
}: {
  quantity: number;
  maximumAffordable: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <Box twClassName="flex-row gap-2 pb-3">
      {[1, 2, 5]
        .filter((value) => value <= MAX_MULTIPACK_COUNT)
        .map((value) => (
          <Button
            key={value}
            size={ButtonSize.Md}
            variant={
              quantity === value
                ? ButtonVariant.Primary
                : ButtonVariant.Secondary
            }
            isDisabled={disabled}
            onPress={() => onChange(value)}
            accessibilityState={{ selected: quantity === value }}
            twClassName={`flex-1 rounded-full px-1 ${quantity === value ? '' : 'bg-section'}`}
            testID={`collectibles-quantity-preset-${value}`}
          >
            {strings(
              value === 1
                ? 'collectibles.purchase.one_pack'
                : 'collectibles.purchase.pack_count',
              { count: value },
            )}
          </Button>
        ))}
      <Button
        size={ButtonSize.Md}
        variant={ButtonVariant.Secondary}
        isDisabled={disabled || maximumAffordable < 1}
        onPress={() => onChange(maximumAffordable)}
        accessibilityLabel={strings('collectibles.purchase.max_affordable', {
          count: maximumAffordable,
        })}
        twClassName="flex-1 rounded-full bg-section px-1"
        testID="collectibles-quantity-max"
      >
        {strings('collectibles.purchase.max')}
      </Button>
    </Box>
  );
}
