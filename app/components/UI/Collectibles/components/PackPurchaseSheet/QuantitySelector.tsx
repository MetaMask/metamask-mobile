import React from 'react';
import {
  Box,
  ButtonIcon,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MAX_MULTIPACK_COUNT } from '../../providers/pack-partner/constants';
import { strings } from '../../../../../../locales/i18n';

/** Shared bounded quantity input for purchase review and buy again. */
export default function QuantitySelector({
  value,
  onChange,
  disabled = false,
  showPackLabel = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** The quick-buy sheet uses an unframed “N packs” quantity control. */
  showPackLabel?: boolean;
}) {
  return (
    <Box
      twClassName={
        showPackLabel
          ? 'flex-row items-center gap-4'
          : 'flex-row items-center gap-3 rounded-full bg-muted p-1'
      }
    >
      <ButtonIcon
        iconName={IconName.Minus}
        accessibilityLabel={strings('collectibles.batch.decrease')}
        isDisabled={disabled || value <= 1}
        onPress={() => onChange(value - 1)}
        testID="collectibles-quantity-minus"
      />
      <Text
        variant={TextVariant.BodyMd}
        color={
          showPackLabel ? TextColor.TextAlternative : TextColor.TextDefault
        }
        twClassName={
          showPackLabel ? 'min-w-16 text-center' : 'min-w-5 text-center'
        }
        testID="collectibles-quantity"
      >
        {showPackLabel
          ? strings(
              value === 1
                ? 'collectibles.purchase.one_pack'
                : 'collectibles.purchase.pack_count',
              { count: value },
            )
          : value}
      </Text>
      <ButtonIcon
        iconName={IconName.Add}
        accessibilityLabel={strings('collectibles.batch.increase')}
        isDisabled={disabled || value >= MAX_MULTIPACK_COUNT}
        onPress={() => onChange(value + 1)}
        testID="collectibles-quantity-plus"
      />
    </Box>
  );
}
