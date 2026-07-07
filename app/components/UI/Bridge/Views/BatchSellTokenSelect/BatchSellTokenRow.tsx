import React from 'react';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import {
  Checkbox,
  FontWeight,
  Text,
  TextColor as DSTextColor,
  TextVariant as DSTextVariant,
} from '@metamask/design-system-react-native';
import {
  TextColor as ComponentLibraryTextColor,
  TextVariant as ComponentLibraryTextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { TokenSelectorItem } from '../../components/TokenSelectorItem';
import {
  TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS,
  TokenSelectorBalanceLayoutVariant,
} from '../../components/TokenSelectorItem.abTestConfig';
import { BridgeToken } from '../../types';

const styles = StyleSheet.create({
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  priceText: {
    flexShrink: 1,
    minWidth: 0,
  },
  tokenBalance: {
    paddingHorizontal: 0,
    textAlign: 'right',
  },
});

interface BatchSellTokenRowProps {
  token: BridgeToken;
  isSelected: boolean;
  networkName?: string;
  networkImageSource?: ImageSourcePropType;
  onTokenPress: (token: BridgeToken) => void;
  tokenPriceText?: string;
  pricePercentChangeText?: string;
  pricePercentChangeTextColor?: DSTextColor;
}

export const BatchSellTokenRow = React.memo(
  ({
    token,
    isSelected,
    networkName,
    networkImageSource,
    onTokenPress,
    tokenPriceText,
    pricePercentChangeText,
    pricePercentChangeTextColor,
  }: BatchSellTokenRowProps) => {
    const secondaryRowContent =
      tokenPriceText || pricePercentChangeText ? (
        <View style={styles.secondaryRow}>
          {tokenPriceText && (
            <Text
              variant={DSTextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={DSTextColor.TextAlternative}
              numberOfLines={1}
              style={styles.priceText}
            >
              {tokenPriceText}
            </Text>
          )}
          {tokenPriceText && pricePercentChangeText && (
            <Text
              variant={DSTextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={DSTextColor.TextAlternative}
            >
              {' • '}
            </Text>
          )}
          {pricePercentChangeText && pricePercentChangeTextColor && (
            <Text
              variant={DSTextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={pricePercentChangeTextColor}
              numberOfLines={1}
            >
              {pricePercentChangeText}
            </Text>
          )}
        </View>
      ) : undefined;

    const pressTargetAccessibilityLabel = `${token.symbol} ${strings(
      'bridge.batch_sell_checkbox_label',
    )}`;

    return (
      <TokenSelectorItem
        token={token}
        onPress={onTokenPress}
        networkName={networkName}
        networkImageSource={networkImageSource}
        isSelected={isSelected}
        shouldChangeSelectedStyle={false}
        shouldShowNetworkIcon={false}
        shouldIncludeChildrenInPressTarget
        pressTargetAccessibilityLabel={pressTargetAccessibilityLabel}
        secondaryRowContent={secondaryRowContent}
        balanceLayoutConfigOverride={
          TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS[
            TokenSelectorBalanceLayoutVariant.Control
          ]
        }
        tokenBalanceTextProps={{
          textVariant: ComponentLibraryTextVariant.BodySMMedium,
          textColor: ComponentLibraryTextColor.Alternative,
          textStyle: styles.tokenBalance,
        }}
      >
        <Checkbox
          isSelected={isSelected}
          // eslint-disable-next-line no-empty-function
          onChange={() => {}}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        />
      </TokenSelectorItem>
    );
  },
);
