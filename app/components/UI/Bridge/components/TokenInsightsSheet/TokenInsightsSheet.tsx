import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { Box } from '../../../Box/Box';
import {
  AlignItems as BoxAlignItems,
  FlexDirection as BoxFlexDirection,
} from '../../../Box/box.types';
import TokenIcon from '../../../Swaps/components/TokenIcon';
import { BridgeToken } from '../../types';
import i18n, { strings } from '../../../../../../locales/i18n';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { showAlert } from '../../../../../actions/alert';
import { useDispatch, useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { formatWithThreshold } from '../../../../../util/assets';
import {
  formatVolume,
  formatPercentage,
} from '../../../Perps/utils/formatUtils';
import { formatAddress } from '../../../../../util/address';

import { RootState } from '../../../../../reducers';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectEvmTokenMarketData } from '../../../../../selectors/multichain/evm';
import { selectTokenDisplayData } from '../../../../../selectors/tokenSearchDiscoveryDataController';

import Engine from '../../../../../core/Engine';
import { handleFetch } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { toAssetId } from '../../hooks/useAssetMetadata/utils';

import { useBridgeExchangeRates } from '../../hooks/useBridgeExchangeRates';
import { setDestTokenExchangeRate } from '../../../../../core/redux/slices/bridge';

import { MarketDataDetails } from '@metamask/assets-controllers';
import { Theme } from '../../../../../util/theme/models';

interface TokenInsightsRouteParams {
  token: BridgeToken;
  networkName: string;
}

type TokenInsightsSheetRouteProp = RouteProp<
  { TokenInsights: TokenInsightsRouteParams },
  'TokenInsights'
>;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: '100%',
      backgroundColor: theme.colors.background.default,
      padding: 24,
    },
    header: {
      gap: 2,
      marginBottom: 16,
    },
    iconContainer: {
      width: 64,
      height: 64,
    },
    titleContainer: {
      gap: 8,
    },
    verifiedBadge: {
      backgroundColor: theme.colors.success.muted,
      borderRadius: 8,
      padding: 8,
      marginBottom: 24,
      gap: 8,
    },
    detailsContainer: {
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    exchangeLogos: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
    },
  });

const TokenInsightsSheet: React.FC = () => {
  const dispatch = useDispatch();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<TokenInsightsSheetRouteProp>();
  const { token } = route.params || {};
  const theme = useTheme();
  const styles = createStyles(theme);

  const currentCurrency = useSelector(selectCurrentCurrency);

  // Get cached market data from TokenRatesController
  const evmMarketData = useSelector((state: RootState) =>
    token
      ? selectEvmTokenMarketData(state, {
          chainId: token.chainId as Hex,
          tokenAddress: token.address,
        })
      : null,
  );

  // Get token display data from TokenSearchDiscoveryDataController
  const tokenSearchResult = useSelector((state: RootState) =>
    token
      ? selectTokenDisplayData(
          state,
          token.chainId as Hex,
          token.address as Hex,
        )
      : null,
  );

  // Use Bridge exchange rate hook to ensure we have price data
  useBridgeExchangeRates({
    token,
    currencyOverride: currentCurrency,
    action: setDestTokenExchangeRate,
  });

  // Fetch token discovery data if not available
  useEffect(() => {
    if (token && !tokenSearchResult?.found) {
      Engine.context.TokenSearchDiscoveryDataController.fetchTokenDisplayData(
        token.chainId as Hex,
        token.address,
      );
    }
  }, [token, tokenSearchResult]);

  // Determine cached market data based on source
  let cachedMarketData: MarketDataDetails | undefined;
  if (tokenSearchResult?.found && tokenSearchResult.price) {
    // Search results have market data
    cachedMarketData = tokenSearchResult.price;
  } else if (evmMarketData && 'marketData' in evmMarketData) {
    // Use TokenRatesController data
    cachedMarketData = evmMarketData.marketData;
  }

  // Fetch from API if not in cache
  const [fetchedMarketData, setFetchedMarketData] = useState<
    Record<string, unknown> | undefined
  >();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cachedMarketData || !token) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const caipChainId = formatChainIdToCaip(token.chainId as Hex);
        const assetId = toAssetId(token.address, caipChainId);
        if (!assetId) return;

        const url = `https://price.api.cx.metamask.io/v3/spot-prices?${new URLSearchParams(
          {
            assetIds: assetId,
            includeMarketData: 'true',
            vsCurrency: currentCurrency.toLowerCase(),
          },
        )}`;

        const response = (await handleFetch(url)) as Record<string, unknown>;
        setFetchedMarketData(response?.[assetId] as Record<string, unknown>);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, cachedMarketData, currentCurrency]);

  // Final market data
  const marketData = cachedMarketData ?? fetchedMarketData;

  // Extract raw values from market data
  const price =
    token?.currencyExchangeRate ??
    (typeof marketData?.price === 'number' ? marketData.price : undefined) ??
    (typeof (marketData as Record<string, unknown>)?.usd === 'number'
      ? ((marketData as Record<string, unknown>).usd as number)
      : undefined);

  const priceChange24h: number =
    (marketData?.pricePercentChange1d as number | undefined) ??
    ((
      (marketData as Record<string, unknown>)?.pricePercentChange as Record<
        string,
        unknown
      >
    )?.P1D as number | undefined) ??
    0;

  const totalVolume = marketData?.totalVolume as number | undefined;
  const marketCap = marketData?.marketCap as number | undefined;
  const dilutedMarketCap = marketData?.dilutedMarketCap as number | undefined;

  // Format price with current currency
  const formattedPrice = useMemo(() => {
    if (!price) return '—';
    return formatWithThreshold(price, 0.01, i18n.locale, {
      style: 'currency',
      currency: currentCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [price, currentCurrency]);

  const handleCopyAddress = useCallback(async () => {
    if (!token?.address) return;

    await ClipboardManager.setString(token.address);
    dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: { msg: strings('transactions.address_copied_to_clipboard') },
      }),
    );
  }, [dispatch, token?.address]);

  const formatPercentChange = (change?: number) => {
    if (!change && change !== 0) return '—';
    return formatPercentage(change);
  };

  const formatContractAddress = (address: string) => {
    if (!address) return '—';
    return formatAddress(address, 'short');
  };

  if (!token) return null;

  // Show loading state while fetching initial data
  if (isLoading && !marketData) {
    return (
      <BottomSheet ref={bottomSheetRef}>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View style={styles.container}>
        {/* Header */}
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.center}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <TokenIcon
              symbol={token.symbol}
              icon={token.image}
              big
              testID={`token-insights-icon-${token.symbol}`}
            />
          </View>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.center}
            style={styles.titleContainer}
          >
            <Text variant={TextVariant.HeadingLG}>{token.symbol} Insights</Text>
          </Box>
        </Box>

        {/* Verified Token Badge */}
        {/* For now we are not showing the verified token badge until the backend supports it*/}
        {/* {false && (
          <Box
            style={styles.verifiedBadge}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.center}
            justifyContent={BoxJustifyContent.center}
          >
            <Icon
              name={IconName.Verified}
              size={IconSize.Sm}
              color={IconColor.Success}
            />
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Success}>
              {strings('bridge.verified_token')}
            </Text>
          </Box>
        )} */}

        {/* Token Details */}
        <Box
          flexDirection={BoxFlexDirection.Column}
          style={styles.detailsContainer}
        >
          {/* Price */}
          <View style={styles.row}>
            <View style={styles.labelContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('bridge.price')}
              </Text>
            </View>
            <Text variant={TextVariant.BodyMD}>{formattedPrice}</Text>
          </View>

          {/* Percent Change */}
          <View style={styles.row}>
            <View style={styles.labelContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('bridge.percent_change')}
              </Text>
            </View>
            <View style={styles.valueContainer}>
              {priceChange24h !== 0 && (
                <Icon
                  name={
                    priceChange24h > 0 ? IconName.ArrowUp : IconName.ArrowDown
                  }
                  size={IconSize.Sm}
                  color={
                    priceChange24h > 0 ? IconColor.Success : IconColor.Error
                  }
                />
              )}
              <Text
                variant={TextVariant.BodyMD}
                color={
                  priceChange24h > 0
                    ? TextColor.Success
                    : priceChange24h < 0
                    ? TextColor.Error
                    : TextColor.Alternative
                }
              >
                {formatPercentChange(priceChange24h)}
              </Text>
            </View>
          </View>

          {/* Volume */}
          <View style={styles.row}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('bridge.volume')}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {formatVolume(totalVolume || 0)}
            </Text>
          </View>

          {/* Market Cap */}
          <View style={styles.row}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('bridge.market_cap_fdv')}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {formatVolume(dilutedMarketCap || marketCap || 0)}
            </Text>
          </View>

          {/* Contract Address */}
          <View style={styles.row}>
            <View style={styles.labelContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('bridge.contract_address')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCopyAddress}>
              <View style={styles.valueContainer}>
                <Icon
                  name={IconName.Copy}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                />
                <Text variant={TextVariant.BodyMD}>
                  {formatContractAddress(token.address)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Box>
      </View>
    </BottomSheet>
  );
};

export default TokenInsightsSheet;
