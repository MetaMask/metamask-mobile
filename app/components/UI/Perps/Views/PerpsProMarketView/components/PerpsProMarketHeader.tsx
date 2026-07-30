import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProMarketHeaderProps {
  symbol: string;
  /** Navigates to the market list. Symbol area is non-interactive when omitted. */
  onSymbolPress?: () => void;
}

const styles = StyleSheet.create({
  container: {
    height: 64,
  },
});

/**
 * Fixed Pro-mode market header.
 *
 * Renders the normalized asset symbol; tapping it navigates to the market
 * list (mirrors the Lite header's `onIdentityPress`). Remaining header
 * actions stay placeholders until their owning capability is implemented.
 */
const PerpsProMarketHeader = ({
  symbol,
  onSymbolPress,
}: PerpsProMarketHeaderProps) => (
  <Box
    testID={PerpsProMarketViewSelectorsIDs.HEADER}
    twClassName="px-4"
    style={styles.container}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
  >
    {onSymbolPress ? (
      <Pressable
        onPress={onSymbolPress}
        accessibilityRole="button"
        accessibilityLabel={strings('perps.market_details.market_list')}
        testID={PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL_BUTTON}
      >
        {({ pressed }) => (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
            twClassName={`rounded-lg p-1 ${pressed ? 'bg-pressed' : ''}`}
          >
            <Text
              testID={PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL}
              variant={TextVariant.HeadingMd}
            >
              {symbol}
            </Text>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Xs}
              color={IconColor.IconAlternative}
            />
          </Box>
        )}
      </Pressable>
    ) : (
      <Text
        testID={PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL}
        variant={TextVariant.HeadingMd}
      >
        {symbol}
      </Text>
    )}
    <Box twClassName="h-8 w-28 rounded-lg bg-muted" />
  </Box>
);

export default PerpsProMarketHeader;
