import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, Share } from 'react-native';
import type { Hex } from '@metamask/utils';
import type {
  MarketDataDetails,
  TokenSecurityData,
} from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import i18n, { strings } from '../../../../../locales/i18n';
import { useElevatedSurface } from '../../../../util/theme/themeUtils';
import { RootState } from '../../../../reducers';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  selectConversionRateBySymbol,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import {
  isAssetFromSearch,
  selectTokenDisplayData,
} from '../../../../selectors/tokenSearchDiscoveryDataController';
import { getTokenExchangeRate } from '../../Bridge/utils/exchange-rates';
import { formatMarketDetails } from '../../AssetOverview/utils/marketDetails';
import { NetworkBadgeSource } from '../../AssetOverview/Balance/Balance';
import { safeToChecksumAddress } from '../../../../util/address';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { localizeLargeNumber } from '../../../../util/number/bigint';
import { TokenI } from '../../Tokens/types';
import ShareTokenCard from './ShareTokenCard';

export interface ShareTokenBottomSheetProps {
  shareUrl: string;
  token: TokenI;
  currentPrice: number;
  priceDiff: number;
  comparePrice: number;
  currentCurrency: string;
  securityData: TokenSecurityData | null;
  networkName?: string;
  onClose: () => void;
}

function formatSharePrice(value: number, currency: string): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(i18n.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatCompactCount(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value < 1_000) {
    return String(Math.round(value));
  }

  const i18nAdapter = { t: (key: string) => strings(key) };
  return localizeLargeNumber(i18nAdapter, value, { includeK: true });
}

function formatLiquidityUsd(
  markets: TokenSecurityData['financialStats']['markets'] | undefined,
  locale: string,
  currentCurrency: string,
): string | null {
  if (!markets?.length) {
    return null;
  }

  const totalReserveUsd = markets.reduce(
    (sum, market) => sum + (market.reserveUSD ?? 0),
    0,
  );

  if (totalReserveUsd <= 0) {
    return null;
  }

  return formatMarketDetails(
    { marketCap: totalReserveUsd },
    { locale, currentCurrency, needsConversion: false },
  ).marketCap;
}

const ShareTokenBottomSheet = ({
  shareUrl,
  token,
  currentPrice,
  priceDiff,
  comparePrice,
  currentCurrency,
  securityData,
  networkName,
  onClose,
}: ShareTokenBottomSheetProps) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const surfaceClass = useElevatedSurface();

  const isNonEvm = isNonEvmChainId(token.chainId as string);
  const checksumAddress = !isNonEvm
    ? safeToChecksumAddress(token.address)
    : token.address;
  const chainId = token.chainId as Hex;

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId),
  );
  const conversionRate =
    useSelector((state: RootState) =>
      selectConversionRateBySymbol(state, nativeCurrency),
    ) ?? 1;
  const currentCurrencyCode = useSelector(selectCurrentCurrency);

  const reduxMarketEntry = useSelector(
    (state: RootState) =>
      selectTokenMarketData(state)?.[chainId]?.[checksumAddress as Hex],
  );

  const tokenSearchResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, chainId, token.address as Hex),
  );
  const searchMarketData =
    isAssetFromSearch(token) && tokenSearchResult?.found
      ? tokenSearchResult.price
      : undefined;

  const [fetchedMarketData, setFetchedMarketData] = useState<
    MarketDataDetails | undefined
  >();

  useEffect(() => {
    if (
      reduxMarketEntry?.price !== undefined ||
      searchMarketData ||
      !checksumAddress
    ) {
      return;
    }

    getTokenExchangeRate({
      chainId,
      tokenAddress: checksumAddress,
      currency: currentCurrencyCode,
      includeMarketData: true,
    })
      .then((data) => {
        if (data) {
          setFetchedMarketData(data as MarketDataDetails);
        }
      })
      .catch(() => undefined);
  }, [
    chainId,
    checksumAddress,
    currentCurrencyCode,
    reduxMarketEntry?.price,
    searchMarketData,
  ]);

  const tokenMarketEntry =
    reduxMarketEntry ?? searchMarketData ?? fetchedMarketData;
  const needsConversion = Boolean(reduxMarketEntry) && !isNonEvm;

  const priceChangePercent = useMemo(() => {
    const api =
      token.pricePercentChange1d ?? tokenMarketEntry?.pricePercentChange1d;
    if (api !== undefined && api !== null && Number.isFinite(api)) {
      return api;
    }
    if (comparePrice > 0) {
      return (priceDiff / comparePrice) * 100;
    }
    return 0;
  }, [
    token.pricePercentChange1d,
    tokenMarketEntry?.pricePercentChange1d,
    comparePrice,
    priceDiff,
  ]);

  const marketDetails = useMemo(() => {
    if (!tokenMarketEntry) {
      return null;
    }

    return formatMarketDetails(
      {
        marketCap: tokenMarketEntry.marketCap
          ? Number(tokenMarketEntry.marketCap)
          : undefined,
        totalVolume: tokenMarketEntry.totalVolume
          ? Number(tokenMarketEntry.totalVolume)
          : undefined,
      },
      {
        locale: i18n.locale,
        currentCurrency: currentCurrencyCode,
        needsConversion,
        conversionRate: conversionRate ?? undefined,
      },
    );
  }, [tokenMarketEntry, needsConversion, conversionRate, currentCurrencyCode]);

  const holdersCount = useMemo(
    () => formatCompactCount(securityData?.financialStats?.holdersCount),
    [securityData?.financialStats?.holdersCount],
  );

  const liquidity = useMemo(
    () =>
      formatLiquidityUsd(
        securityData?.financialStats?.markets,
        i18n.locale,
        currentCurrencyCode,
      ),
    [securityData?.financialStats?.markets, currentCurrencyCode],
  );

  const volume24h = useMemo(() => {
    if (marketDetails?.totalVolume) {
      return marketDetails.totalVolume;
    }

    const tradeVolume = securityData?.financialStats?.tradeVolume24h;
    if (tradeVolume == null || tradeVolume <= 0) {
      return null;
    }

    return formatMarketDetails(
      { totalVolume: tradeVolume },
      {
        locale: i18n.locale,
        currentCurrency: currentCurrencyCode,
        needsConversion: false,
      },
    ).totalVolume;
  }, [
    marketDetails?.totalVolume,
    securityData?.financialStats?.tradeVolume24h,
    currentCurrencyCode,
  ]);

  const formattedPrice = useMemo(
    () => formatSharePrice(currentPrice, currentCurrency),
    [currentPrice, currentCurrency],
  );

  const statTiles = useMemo(
    () => [
      {
        label: strings('share_token.market_cap'),
        value: marketDetails?.marketCap ?? null,
        testID: 'share-token-market-cap',
      },
      {
        label: strings('share_token.price'),
        value: formattedPrice,
        testID: 'share-token-price',
      },
      {
        label: strings('share_token.liquidity'),
        value: liquidity,
        testID: 'share-token-liquidity',
      },
      {
        label: strings('share_token.holders'),
        value: holdersCount,
        testID: 'share-token-holders',
      },
      {
        label: strings('share_token.volume_24h'),
        value: volume24h,
        testID: 'share-token-volume',
      },
    ],
    [
      marketDetails?.marketCap,
      formattedPrice,
      liquidity,
      holdersCount,
      volume24h,
    ],
  );

  const networkBadgeSource = token.chainId
    ? NetworkBadgeSource(token.chainId as Hex)
    : undefined;

  const handleNativeShare = useCallback(async () => {
    await Share.share(
      Platform.OS === 'ios' ? { url: shareUrl } : { message: shareUrl },
    );
  }, [shareUrl]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      twClassName={surfaceClass}
      testID="share-token-sheet"
    >
      <BottomSheetHeader textProps={{ variant: TextVariant.HeadingLg }}>
        {strings('share_token.title')}
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4 gap-3">
        <ShareTokenCard
          token={token}
          shareUrl={shareUrl}
          priceChangePercent={priceChangePercent}
          statTiles={statTiles}
          networkBadgeSource={networkBadgeSource}
          networkName={networkName}
        />

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          numberOfLines={2}
          testID="share-token-url"
        >
          {shareUrl}
        </Text>
      </Box>

      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('share_token.share'),
          onPress: handleNativeShare,
          size: ButtonSize.Lg,
          startIconName: IconName.Share,
          testID: 'share-token-native-share-button',
        }}
        twClassName="px-4"
      />
    </BottomSheet>
  );
};

export default ShareTokenBottomSheet;
