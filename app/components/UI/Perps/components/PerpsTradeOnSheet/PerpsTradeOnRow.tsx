import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../locales/i18n';
import PerpsProviderLogos from '../PerpsProviderLogos';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import type { PerpsProviderType } from '@metamask/perps-controller';

interface PerpsTradeOnRowProps {
  /** Venue this order will go to. */
  providerId: PerpsProviderType;
  onPress: () => void;
  testID?: string;
}

/** Venue-mark size inside the tag; the design tag holds a 12px badge. */
const TRADE_ON_ROW_LOGO_SIZE = 12;

/**
 * The "Provided by [venue ⌄]" trigger under the Long/Short buttons
 * (TAT-4418). One centered control: the label and a tag pill carrying the
 * venue's mark, its name, and a chevron. Hidden by the caller unless two
 * or more venues list the market.
 */
const PerpsTradeOnRow: React.FC<PerpsTradeOnRowProps> = ({
  providerId,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const venueName = PROVIDER_DISPLAY_INFO[providerId].name;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings('perps.trade_on.accessibility_label', {
        venue: venueName,
      })}
      testID={testID}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center justify-center gap-2',
          pressed && 'opacity-70',
        )
      }
    >
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {strings('perps.trade_on.provided_by')}
      </Text>
      <Box
        accessible={false}
        twClassName="flex-row items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5"
        testID={testID ? `${testID}-tag` : undefined}
      >
        <PerpsProviderLogos
          providerIds={[providerId]}
          size={TRADE_ON_ROW_LOGO_SIZE}
          isDecorative
        />
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {venueName}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
          testID={testID ? `${testID}-chevron` : undefined}
        />
      </Box>
    </Pressable>
  );
};

export default PerpsTradeOnRow;
