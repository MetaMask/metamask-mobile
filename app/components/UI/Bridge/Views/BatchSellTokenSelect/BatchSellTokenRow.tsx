import React from 'react';
import { ImageSourcePropType } from 'react-native';
import { Checkbox } from '@metamask/design-system-react-native';
import {
  formatChainIdToHex,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { TextColor as ComponentLibraryTextColor } from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { useTokenPricePercentageChange } from '../../../Tokens/hooks/useTokenPricePercentageChange';
import { TokenSelectorItem } from '../../components/TokenSelectorItem';
import { BridgeToken } from '../../types';

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
  const pricePercentChange = useTokenPricePercentageChange({
    address: token.address,
    chainId: formatChainIdToHex(token.chainId),
    isNative: isNativeAddress(token.address),
  });
  const pricePercentChangeText = getPricePercentChangeText(pricePercentChange);
  const pricePercentChangeTextColor =
    pricePercentChangeText && pricePercentChange !== undefined
      ? getPricePercentChangeTextColor(pricePercentChange)
      : undefined;

  return (
    <TokenSelectorItem
      token={token}
      onPress={onTokenPress}
      networkName={networkName}
      networkImageSource={networkImageSource}
      isSelected={isSelected}
      pricePercentChangeText={pricePercentChangeText}
      pricePercentChangeTextColor={pricePercentChangeTextColor}
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
