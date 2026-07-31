import React from 'react';
import { Pressable, type StyleProp, type TextStyle } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_COLLATERAL_SYMBOL } from '../../constants/perpsConfig';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../PerpsTokenLogo';

export interface PerpsMarketIdentityTestIDs {
  assetIcon?: string;
  assetName?: string;
  subtitle?: string;
  marketListButton?: string;
}

export interface PerpsMarketIdentityProps {
  symbol: string;
  /** Full asset name (e.g. "Bitcoin"). Falls back to the display symbol. */
  name?: string;
  maxLeverage?: string;
  /** Token logo size in px. Lite detail uses 40; Pro uses 32. */
  size?: number;
  /** Row gap between logo and text. Lite uses 3; Pro uses 2. */
  gap?: 2 | 3;
  /** Optional style applied to the asset name (e.g. Pro's maxWidth: 120). */
  nameStyle?: StyleProp<TextStyle>;
  /**
   * When provided, the identity becomes a content-hugging pressable that opens
   * the market list and shows a trailing caret.
   */
  onPress?: () => void;
  testIDs?: PerpsMarketIdentityTestIDs;
  /**
   * When provided, replaces the default `[Ticker]-[collateral] perp`
   * subtitle row entirely (e.g. Pro's scroll-linked live price crossfade).
   */
  subtitleContent?: React.ReactNode;
}

/**
 * Shared market identity block used by Lite and Pro market headers.
 *
 * Renders token logo + asset name + leverage tag + optional caret on the
 * first row, and the `[Ticker]-[collateral] perp` subtitle on the second.
 */
const PerpsMarketIdentity = ({
  symbol,
  name,
  maxLeverage,
  size = 40,
  gap = 3,
  nameStyle,
  onPress,
  testIDs,
  subtitleContent,
}: PerpsMarketIdentityProps) => {
  const displaySymbol = getPerpsDisplaySymbol(symbol);
  const displayTitle = name || displaySymbol;
  const subtitle = strings('perps.market_details.perp_pair', {
    ticker: displaySymbol,
    collateral: PERPS_COLLATERAL_SYMBOL,
  });

  const renderContent = (pressed: boolean) => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={gap}
      twClassName={`self-start rounded-lg p-1 ${pressed ? 'bg-pressed' : ''}`}
    >
      <PerpsTokenLogo symbol={symbol} size={size} testID={testIDs?.assetIcon} />
      <Box flexDirection={BoxFlexDirection.Column}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            style={nameStyle}
            testID={testIDs?.assetName}
          >
            {displayTitle}
          </Text>
          {maxLeverage ? <PerpsLeverage maxLeverage={maxLeverage} /> : null}
          {onPress ? (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Xs}
              color={IconColor.IconAlternative}
            />
          ) : null}
        </Box>
        {subtitleContent ?? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            testID={testIDs?.subtitle}
          >
            {subtitle}
          </Text>
        )}
      </Box>
    </Box>
  );

  if (!onPress) {
    return renderContent(false);
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings('perps.market_details.market_list')}
      testID={testIDs?.marketListButton}
    >
      {({ pressed }) => renderContent(pressed)}
    </Pressable>
  );
};

export default PerpsMarketIdentity;
