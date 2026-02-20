import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import {
  CaipAssetType,
  CaipChainId,
  isCaipAssetType,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';
import { useRampNavigation } from '../../../../../UI/Ramp/hooks/useRampNavigation';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { strings } from '../../../../../../../locales/i18n';
import type { PopularToken } from '../hooks/usePopularTokens';

// Zero address used for native EVM tokens (ETH, BNB, etc.)
const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Parses a CAIP-19 asset ID to extract chainId, address, and chain type info.
 * Uses @metamask/utils functions directly and adds EVM-specific post-processing.
 *
 * @param assetId - CAIP-19 asset ID (e.g., "eip155:1/erc20:0x123...")
 * @returns Parsed asset info with chainId, address, and type flags
 */
const parseAssetIdForNavigation = (
  assetId: string,
): {
  chainId: string;
  address: string;
  isEvmChain: boolean;
  isNative: boolean;
} => {
  // Validate CAIP-19 format
  if (!isCaipAssetType(assetId as CaipAssetType)) {
    return {
      chainId: '',
      address: '',
      isEvmChain: false,
      isNative: false,
    };
  }

  try {
    // Parse using @metamask/utils functions
    const parsedAsset = parseCaipAssetType(assetId as CaipAssetType);
    const parsedChain = parseCaipChainId(parsedAsset.chainId as CaipChainId);

    const { namespace, reference: chainReference } = parsedChain;
    const { assetNamespace, assetReference } = parsedAsset;

    const isEvmChain = namespace === 'eip155';
    const isNative = assetNamespace === 'slip44';

    let chainId: string;
    let address: string;

    if (isEvmChain) {
      // EVM chains use hex chainId format for navigation
      chainId = `0x${parseInt(chainReference, 10).toString(16)}`;
      // For native tokens (slip44), use zero address; for ERC20, use the contract address
      address = isNative ? NATIVE_TOKEN_ADDRESS : assetReference;
    } else {
      // Non-EVM chains use CAIP-2 format for chainId
      chainId = `${namespace}:${chainReference}`;
      // For non-EVM chains, address is the full CAIP-19 asset ID
      address = assetId;
    }

    return { chainId, address, isEvmChain, isNative };
  } catch {
    return {
      chainId: '',
      address: '',
      isEvmChain: false,
      isNative: false,
    };
  }
};

interface PopularTokenRowProps {
  token: PopularToken;
}

/**
 * Formats a price for display with appropriate decimal places
 */
const formatPrice = (price: number, currency: string): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency.toUpperCase()} ${price.toFixed(2)}`;
  }
};

/**
 * Formats percentage change with sign and color
 */
const formatPercentageChange = (
  change: number | undefined,
): { text: string; color: TextColor } => {
  if (change === undefined || change === null || !Number.isFinite(change)) {
    return { text: '', color: TextColor.Alternative };
  }

  const sign = change >= 0 ? '+' : '';
  const text = `${sign}${change.toFixed(2)}%`;

  let color = TextColor.Alternative;
  if (change > 0) {
    color = TextColor.Success;
  } else if (change < 0) {
    color = TextColor.Error;
  }

  return { text, color };
};

/**
 * A row component for displaying a popular token in the zero balance state.
 * Shows token icon, name, price, percentage change, and a Buy button.
 * Tapping the row navigates to asset details, tapping Buy navigates to buy flow.
 */
const PopularTokenRow: React.FC<PopularTokenRowProps> = ({ token }) => {
  const navigation = useNavigation();
  const { goToBuy } = useRampNavigation();
  const currentCurrency = useSelector(selectCurrentCurrency);

  const handleRowPress = useCallback(() => {
    const { chainId, address, isNative } = parseAssetIdForNavigation(
      token.assetId,
    );

    navigation.navigate('Asset', {
      chainId,
      address,
      symbol: token.symbol,
      isNative,
    });
  }, [navigation, token.assetId, token.symbol]);

  const handleBuy = useCallback(() => {
    goToBuy({ assetId: token.assetId });
  }, [goToBuy, token.assetId]);

  const priceDisplay = useMemo(() => {
    if (token.price === undefined) {
      return '—';
    }
    return formatPrice(token.price, currentCurrency);
  }, [token.price, currentCurrency]);

  const percentageChange = useMemo(
    () => formatPercentageChange(token.priceChange1d),
    [token.priceChange1d],
  );

  return (
    <TouchableOpacity onPress={handleRowPress} activeOpacity={0.7}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="h-16"
      >
        {/* Token Avatar */}
        <AvatarToken
          name={token.name}
          imageSource={{ uri: token.iconUrl }}
          size={AvatarSize.Lg}
        />

        {/* Token Info - matches TokenListItem balances style: flex-1, justify-center, ml-5 */}
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="flex-1 justify-center ml-5"
        >
          <Text variant={TextVariant.BodyMDMedium} numberOfLines={1}>
            {token.name}
          </Text>
          {token.description ? (
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {token.description}
            </Text>
          ) : (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Text
                variant={TextVariant.BodySMMedium}
                color={TextColor.Alternative}
              >
                {priceDisplay}
              </Text>
              {percentageChange.text ? (
                <Box twClassName="ml-2">
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={percentageChange.color}
                  >
                    {percentageChange.text}
                  </Text>
                </Box>
              ) : null}
            </Box>
          )}
        </Box>

        {/* Buy Button */}
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={handleBuy}
        >
          {strings('asset_overview.buy_button')}
        </Button>
      </Box>
    </TouchableOpacity>
  );
};

export default PopularTokenRow;
