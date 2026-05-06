import React, { useMemo } from 'react';
import { ImageSourcePropType, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { Checkbox } from '@metamask/design-system-react-native';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  formatChainIdToHex,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import Text, {
  TextColor as ComponentLibraryTextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { RootState } from '../../../../../reducers';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNativeCurrencyByChainId } from '../../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../../util/address';
import { strings } from '../../../../../../locales/i18n';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';
import { useTokenPricePercentageChange } from '../../../Tokens/hooks/useTokenPricePercentageChange';
import { TokenSelectorItem } from '../../components/TokenSelectorItem';
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
});

function getPricePercentChangeText(
  pricePercentChange: number | undefined,
): string | undefined {
  if (
    pricePercentChange === undefined ||
    !Number.isFinite(pricePercentChange)
  ) {
    return undefined;
  }

  return `${pricePercentChange >= 0 ? '+' : ''}${pricePercentChange.toFixed(
    2,
  )}%`;
}

function getPricePercentChangeTextColor(
  pricePercentChange: number,
): ComponentLibraryTextColor {
  if (pricePercentChange > 0) {
    return ComponentLibraryTextColor.Success;
  }

  if (pricePercentChange < 0) {
    return ComponentLibraryTextColor.Error;
  }

  return ComponentLibraryTextColor.Alternative;
}

function getTokenPriceInFiat({
  token,
  chainId,
  isNative,
  tokenMarketData,
  currencyRates,
  nativeCurrency,
}: {
  token: BridgeToken;
  chainId: Hex;
  isNative: boolean;
  tokenMarketData: ReturnType<typeof selectTokenMarketData>;
  currencyRates: ReturnType<typeof selectCurrencyRates>;
  nativeCurrency?: string;
}): number | undefined {
  const addressToUse = isNative
    ? getNativeTokenAddress(chainId)
    : safeToChecksumAddress(token.address);
  const marketPriceInNative =
    tokenMarketData?.[chainId]?.[addressToUse as Hex]?.price;

  if (marketPriceInNative != null) {
    const nativeToFiatRate = nativeCurrency
      ? currencyRates?.[nativeCurrency]?.conversionRate
      : undefined;

    return nativeToFiatRate
      ? marketPriceInNative * nativeToFiatRate
      : undefined;
  }

  const nativePriceInFiat = isNative
    ? currencyRates?.[token.symbol]?.conversionRate
    : undefined;

  return nativePriceInFiat ?? undefined;
}

interface BatchSellTokenRowProps {
  token: BridgeToken;
  isSelected: boolean;
  networkName?: string;
  networkImageSource?: ImageSourcePropType;
  onTokenPress: (token: BridgeToken) => void;
}

export function BatchSellTokenRow({
  token,
  isSelected,
  networkName,
  networkImageSource,
  onTokenPress,
}: BatchSellTokenRowProps) {
  const chainId = formatChainIdToHex(token.chainId) as Hex;
  const isNative = isNativeAddress(token.address);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId),
  );
  const pricePercentChange = useTokenPricePercentageChange({
    address: token.address,
    chainId,
    isNative,
  });
  const tokenPriceInFiat = useMemo(
    () =>
      getTokenPriceInFiat({
        token,
        chainId,
        isNative,
        tokenMarketData,
        currencyRates,
        nativeCurrency,
      }),
    [token, chainId, isNative, tokenMarketData, currencyRates, nativeCurrency],
  );
  const tokenPriceText =
    tokenPriceInFiat !== undefined
      ? formatPriceWithSubscriptNotation(tokenPriceInFiat, currentCurrency)
      : undefined;
  const pricePercentChangeText = getPricePercentChangeText(pricePercentChange);
  const pricePercentChangeTextColor =
    pricePercentChangeText && pricePercentChange !== undefined
      ? getPricePercentChangeTextColor(pricePercentChange)
      : undefined;
  const secondaryRowContent =
    tokenPriceText || pricePercentChangeText ? (
      <View style={styles.secondaryRow}>
        {tokenPriceText && (
          <Text
            variant={TextVariant.BodySMMedium}
            color={ComponentLibraryTextColor.Alternative}
            numberOfLines={1}
            style={styles.priceText}
          >
            {tokenPriceText}
          </Text>
        )}
        {tokenPriceText && pricePercentChangeText && (
          <Text
            variant={TextVariant.BodySMMedium}
            color={ComponentLibraryTextColor.Alternative}
          >
            {' • '}
          </Text>
        )}
        {pricePercentChangeText && pricePercentChangeTextColor && (
          <Text
            variant={TextVariant.BodySMMedium}
            color={pricePercentChangeTextColor}
            numberOfLines={1}
          >
            {pricePercentChangeText}
          </Text>
        )}
      </View>
    ) : undefined;

  return (
    <TokenSelectorItem
      token={token}
      onPress={onTokenPress}
      networkName={networkName}
      networkImageSource={networkImageSource}
      isSelected={isSelected}
      secondaryRowContent={secondaryRowContent}
    >
      <Checkbox
        isSelected={isSelected}
        onChange={() => onTokenPress(token)}
        accessibilityLabel={`${token.symbol} ${strings(
          'bridge.batch_sell_checkbox_label',
        )}`}
      />
    </TokenSelectorItem>
  );
}
