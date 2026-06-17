import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CaipAssetType, Hex } from '@metamask/utils';
import { darkTheme } from '@metamask/design-tokens';
import { captureRef } from 'react-native-view-shot';
import {
  isAvailableAsync as isSharingAvailable,
  shareAsync,
} from 'expo-sharing';
import { useSelector } from 'react-redux';
import Svg, { Polyline } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { useStyles } from '../../../../component-library/hooks/useStyles';
import { IconName as LibIconName } from '../../../../component-library/components/Icons/Icon';
import type { Theme } from '../../../../util/theme/models';
import ClipboardManager from '../../../../core/ClipboardManager';
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
import NetworkAssetLogo from '../../NetworkAssetLogo';
import { getFallbackAssetImageUrls } from '../../Assets/components/AssetLogo/AssetLogo.utils';
import { useSmartImageFallback } from '../../Assets/components/AssetLogo/AssetLogo.hook';
import i18n from '../../../../../locales/i18n';
import { RootState } from '../../../../reducers';
import { safeToChecksumAddress } from '../../../../util/address';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { TokenI } from '../../Tokens/types';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import type { MarketDataDetails } from '@metamask/assets-controllers';

const UNIVERSAL_LINK_HOST = 'link.metamask.io';
const CHART_WIDTH = 100;
const CHART_HEIGHT = 70;

// Third-party social app brand colors — no design token equivalents
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const BRAND_WHATSAPP = '#25D366';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const BRAND_TELEGRAM = '#2AABEE';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const BRAND_X = '#000000';
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const BRAND_SIGNAL = '#3A76F0';

// Apps to probe — shown only if installed on the device
const SHARE_APP_DEFINITIONS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    bgColor: BRAND_WHATSAPP,
    checkScheme: 'whatsapp://send',
    buildShareUrl: (text: string) =>
      `whatsapp://send?text=${encodeURIComponent(text)}`,
    icon: IconName.Messages,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    bgColor: BRAND_TELEGRAM,
    checkScheme: 'tg://msg',
    buildShareUrl: (text: string) =>
      `tg://msg?text=${encodeURIComponent(text)}`,
    icon: IconName.Send,
  },
  {
    id: 'x',
    label: 'X',
    bgColor: BRAND_X,
    checkScheme: 'twitter://',
    buildShareUrl: (text: string) =>
      `twitter://post?message=${encodeURIComponent(text)}`,
    icon: IconName.Share,
  },
  {
    id: 'signal',
    label: 'Signal',
    bgColor: BRAND_SIGNAL,
    checkScheme: 'sgnl://',
    buildShareUrl: (text: string) =>
      `sgnl://send?text=${encodeURIComponent(text)}`,
    icon: IconName.Messages,
  },
] as const;

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function formatDisplayAddress(
  address: string,
  nonEvm: boolean,
  isNative: boolean,
): string {
  if (!address || isNative || address === ZERO_ADDRESS) return 'Native token';
  if (nonEvm) {
    const slashIdx = address.indexOf('/');
    const colonIdx = address.indexOf(':');
    if (colonIdx !== -1) {
      const namespace = address.slice(0, colonIdx);
      const assetSuffix = slashIdx !== -1 ? address.slice(slashIdx + 1) : '';
      return assetSuffix
        ? `${namespace}:.../${assetSuffix}`
        : `${namespace}:...`;
    }
    return `${address.slice(0, 10)}...`;
  }
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(): string {
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'shortOffset',
  });
  const date = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${time}\n${date}`;
}

// ─── styles ──────────────────────────────────────────────────────────────────
// The share card is always rendered in dark mode (it is a branded share snapshot).
// We pull colors from darkTheme tokens so the card is consistently dark regardless
// of the user's current light/dark preference.

const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    // ── Sheet chrome ──
    sheetHeader: {
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 8,
      alignItems: 'flex-start',
    },
    // ── Branded dark card ──
    card: {
      backgroundColor: darkTheme.colors.background.alternative,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: darkTheme.colors.border.muted,
      padding: 10,
      gap: 6,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      marginRight: 6,
      overflow: 'hidden',
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      flexShrink: 0,
      overflow: 'hidden',
    },
    tokenMeta: {
      flex: 1,
      gap: 1,
      overflow: 'hidden',
    },
    tokenSymbol: {
      color: darkTheme.colors.text.default,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    tokenAddress: {
      color: darkTheme.colors.text.alternative,
      fontSize: 10,
    },
    timestamp: {
      color: darkTheme.colors.text.alternative,
      fontSize: 9,
      textAlign: 'right',
      lineHeight: 13,
    },
    divider: {
      height: 1,
      backgroundColor: darkTheme.colors.border.muted,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    statsCol: {
      flex: 1,
      gap: 4,
    },
    statLabel: {
      color: darkTheme.colors.text.alternative,
      fontSize: 9,
      fontWeight: '500',
    },
    pctValue: {
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: -0.5,
      lineHeight: 20,
    },
    // Inline market cap row: label + value on the same line
    inlineStatRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    inlineStatValue: {
      color: darkTheme.colors.text.default,
      fontSize: 11,
      fontWeight: '600',
    },
    // 2-column mini grid inside the stats column
    miniGrid: {
      flexDirection: 'row',
      gap: 6,
    },
    miniGridItem: {
      flex: 1,
      gap: 1,
    },
    statValue: {
      color: darkTheme.colors.text.default,
      fontSize: 11,
      fontWeight: '600',
    },
    chartCol: {
      justifyContent: 'flex-start',
      paddingTop: 2,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    qrWrapper: {
      backgroundColor: darkTheme.colors.overlay.inverse,
      padding: 4,
      borderRadius: 6,
    },
    branding: {
      alignItems: 'flex-end',
      gap: 2,
    },
    brandName: {
      color: darkTheme.colors.text.default,
      fontSize: 12,
      fontWeight: '700',
    },
    brandTagline: {
      color: darkTheme.colors.text.alternative,
      fontSize: 9,
    },
    // ── Share action circles ──
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      paddingTop: 0,
    },
    circleWrapper: {
      alignItems: 'center',
      gap: 4,
    },
    circle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleLg: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleLabel: {
      textAlign: 'center',
    },
  });

// ─── sub-component: token avatar at a fixed small size ───────────────────────

const TokenAvatarSm: React.FC<{ token: TokenI }> = ({ token: asset }) => {
  const images = useMemo(
    () =>
      [
        asset.image,
        ...(getFallbackAssetImageUrls(asset.chainId, asset.address) ?? []),
      ]
        .filter((img): img is string => Boolean(img))
        .map((img) => ({ uri: img })),
    [asset.image, asset.chainId, asset.address],
  );
  const { source, onError, uniqueSourceImageKey } =
    useSmartImageFallback(images);

  if (asset.isNative || asset.isETH) {
    return (
      <NetworkAssetLogo
        chainId={asset.chainId as string}
        ticker={asset.ticker ?? asset.symbol}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ width: 28, height: 28 }}
        big={false}
        biggest={false}
      />
    );
  }
  return (
    <AvatarToken
      key={uniqueSourceImageKey}
      name={asset.symbol}
      src={source}
      size={AvatarTokenSize.Sm}
      imageOrSvgProps={{ imageProps: { onError } }}
    />
  );
};

// ─── sub-component: circular share action button ─────────────────────────────

interface ShareCircleProps {
  label: string;
  bgColor: string;
  iconName: IconName;
  iconColor?: IconColor | string;
  large?: boolean;
  onPress: () => void;
}

const ShareCircle: React.FC<ShareCircleProps> = ({
  label,
  bgColor,
  iconName,
  iconColor = IconColor.PrimaryInverse,
  large = false,
  onPress,
}) => {
  const { styles: circleStyles } = useStyles(createStyles, {});
  return (
    <TouchableOpacity
      style={circleStyles.circleWrapper}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          large ? circleStyles.circleLg : circleStyles.circle,
          { backgroundColor: bgColor },
        ]}
      >
        <Icon
          name={iconName}
          size={large ? IconSize.Lg : IconSize.Md}
          color={iconColor as IconColor}
        />
      </View>
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextDefault}
        style={circleStyles.circleLabel}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── types ───────────────────────────────────────────────────────────────────

export interface ShareTokenSheetProps {
  token: TokenI;
  caip19AssetId: CaipAssetType | null;
  currentPrice: number;
  priceDiff: number;
  comparePrice: number;
  currentCurrency: string;
  prices: TokenPrice[];
  onClose: () => void;
}

// ─── component ───────────────────────────────────────────────────────────────

const ShareTokenSheet: React.FC<ShareTokenSheetProps> = ({
  token,
  caip19AssetId,
  currentPrice,
  priceDiff,
  comparePrice,
  currentCurrency,
  prices,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const cardRef = useRef<View>(null);
  const { toastRef } = useContext(ToastContext);
  const { styles, theme } = useStyles(createStyles, {});
  const [isCapturing, setIsCapturing] = useState(false);

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

  // Tier 1: Redux (imported tokens — data in native units, needs conversion)
  const reduxMarketEntry = useSelector(
    (state: RootState) =>
      selectTokenMarketData(state)?.[chainId]?.[checksumAddress as Hex],
  );

  // Tier 2: token-search discovery data (already in fiat, no conversion needed)
  const tokenSearchResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, chainId, token.address as Hex),
  );
  const searchMarketData =
    isAssetFromSearch(token) && tokenSearchResult?.found
      ? tokenSearchResult.price
      : undefined;

  // Tier 3: spot-prices API fetch (already in fiat, no conversion needed)
  const [fetchedMarketData, setFetchedMarketData] = useState<
    MarketDataDetails | undefined
  >();

  useEffect(() => {
    // Skip if we already have data from Redux or search
    if (
      reduxMarketEntry?.price !== undefined ||
      searchMarketData ||
      !checksumAddress
    )
      return;

    getTokenExchangeRate({
      chainId,
      tokenAddress: checksumAddress,
      currency: currentCurrencyCode,
      includeMarketData: true,
    })
      .then((data) => {
        if (data) setFetchedMarketData(data as MarketDataDetails);
      })
      .catch(() => undefined);
  }, [
    chainId,
    checksumAddress,
    currentCurrencyCode,
    reduxMarketEntry?.price,
    searchMarketData,
  ]);

  // Resolved market data + whether it needs native-unit conversion
  const tokenMarketEntry =
    reduxMarketEntry ?? searchMarketData ?? fetchedMarketData;
  const needsConversion = Boolean(reduxMarketEntry) && !isNonEvm;

  const deeplink = caip19AssetId
    ? `https://${UNIVERSAL_LINK_HOST}/asset?assetId=${caip19AssetId}`
    : null;

  const shareText = deeplink
    ? `Check out ${token.symbol} on MetaMask: ${deeplink}`
    : '';

  // 24h change %
  const pricePct = useMemo(() => {
    const api =
      token.pricePercentChange1d ?? tokenMarketEntry?.pricePercentChange1d;
    if (api !== undefined) return api;
    if (comparePrice > 0) return (priceDiff / comparePrice) * 100;
    return 0;
  }, [token.pricePercentChange1d, tokenMarketEntry, comparePrice, priceDiff]);

  const isPriceUp = pricePct >= 0;
  const accentColor = isPriceUp
    ? theme.colors.success.default
    : theme.colors.error.default;

  const formattedPrice = useMemo(
    () => formatPrice(currentPrice, currentCurrency),
    [currentPrice, currentCurrency],
  );
  const formattedPct = useMemo(
    () => `${isPriceUp ? '+' : ''}${pricePct.toFixed(2)}%`,
    [isPriceUp, pricePct],
  );
  const marketDetails = useMemo(() => {
    if (!tokenMarketEntry) return null;
    return formatMarketDetails(
      {
        marketCap: tokenMarketEntry.marketCap
          ? Number(tokenMarketEntry.marketCap)
          : undefined,
        totalVolume: tokenMarketEntry.totalVolume
          ? Number(tokenMarketEntry.totalVolume)
          : undefined,
        circulatingSupply: tokenMarketEntry.circulatingSupply
          ? Number(tokenMarketEntry.circulatingSupply)
          : undefined,
        allTimeHigh: tokenMarketEntry.allTimeHigh
          ? Number(tokenMarketEntry.allTimeHigh)
          : undefined,
        allTimeLow: tokenMarketEntry.allTimeLow
          ? Number(tokenMarketEntry.allTimeLow)
          : undefined,
        dilutedMarketCap: tokenMarketEntry.dilutedMarketCap
          ? Number(tokenMarketEntry.dilutedMarketCap)
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

  // Sparkline
  const sparklinePoints = useMemo(() => {
    if (prices.length < 2) return null;
    const sample = prices.slice(-40);
    const vals = sample.map(([, p]) => p);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return sample
      .map(([, p], i) => {
        const x = ((i / (sample.length - 1)) * CHART_WIDTH).toFixed(1);
        const y = (
          CHART_HEIGHT -
          ((p - min) / range) * CHART_HEIGHT * 0.9
        ).toFixed(1);
        return `${x},${y}`;
      })
      .join(' ');
  }, [prices]);

  const timestamp = useMemo(() => formatTimestamp(), []);
  const isNativeToken = Boolean(token.isETH || token.isNative);
  const displayAddress = formatDisplayAddress(
    token.address,
    isNonEvm,
    isNativeToken,
  );

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleCopy = useCallback(async () => {
    if (!deeplink) return;
    await ClipboardManager.setString(deeplink);
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: LibIconName.CheckBold,
      labelOptions: [{ label: i18n.t('share_token.copied') }],
      hasNoTimeout: false,
    });
  }, [deeplink, toastRef]);

  const handleMore = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      // 1. Capture the branded card as a PNG
      const uri = cardRef.current
        ? await captureRef(cardRef.current, { format: 'png', quality: 1 })
        : null;

      if (uri && (await isSharingAvailable())) {
        // 2. Open the native share sheet with the image via expo-sharing
        await shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share token info',
          UTI: 'public.png',
        });
      } else {
        // 3. Fallback: share the link text via the built-in Share API
        await Share.share({ url: deeplink ?? undefined, message: shareText });
      }
    } catch {
      // User dismissed the share sheet — no action needed
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, deeplink, shareText]);

  // Detect which apps from the list are installed on this device
  const [installedAppIds, setInstalledAppIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all(
      SHARE_APP_DEFINITIONS.map(async (app) => ({
        id: app.id,
        installed: await Linking.canOpenURL(app.checkScheme).catch(() => false),
      })),
    ).then((results) => {
      setInstalledAppIds(results.filter((r) => r.installed).map((r) => r.id));
    });
  }, []);

  const handleAppShare = useCallback(
    async (buildShareUrl: (text: string) => string) => {
      if (!shareText) return;
      await Linking.openURL(buildShareUrl(shareText)).catch(() =>
        Share.share({ message: shareText, url: deeplink ?? undefined }),
      );
    },
    [shareText, deeplink],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <View style={styles.sheetHeader}>
        <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
          {i18n.t('share_token.title')}
        </Text>
      </View>

      <Box twClassName="px-4 pb-3 gap-2">
        {/* ── Share card ── captured as image when sharing */}
        <View ref={cardRef} style={styles.card} collapsable={false}>
          {/* Row 1 — identity + timestamp */}
          <View style={styles.headerRow}>
            <View style={styles.tokenRow}>
              <View style={styles.avatar}>
                <TokenAvatarSm token={token} />
              </View>
              <View style={styles.tokenMeta}>
                <Text style={styles.tokenSymbol} numberOfLines={1}>
                  {token.symbol}
                </Text>
                <Text style={styles.tokenAddress} numberOfLines={1}>
                  {displayAddress}
                </Text>
              </View>
            </View>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>

          <View style={styles.divider} />

          {/* Row 2 — left: all stats | right: sparkline */}
          <View style={styles.contentRow}>
            {/* Left: all stats */}
            <View style={styles.statsCol}>
              <Text style={styles.statLabel}>24h change</Text>
              <Text style={[styles.pctValue, { color: accentColor }]}>
                {formattedPct}
              </Text>

              {/* Market cap inline */}
              {marketDetails?.marketCap ? (
                <View style={styles.inlineStatRow}>
                  <Text style={styles.statLabel}>Market cap</Text>
                  <Text style={styles.inlineStatValue}>
                    {marketDetails.marketCap}
                  </Text>
                </View>
              ) : null}

              {/* Mini 2-col grid: Price | 24h volume */}
              <View style={styles.miniGrid}>
                <View style={styles.miniGridItem}>
                  <Text style={styles.statLabel}>Price</Text>
                  <Text style={styles.statValue}>{formattedPrice}</Text>
                </View>
                {marketDetails?.totalVolume ? (
                  <View style={styles.miniGridItem}>
                    <Text style={styles.statLabel}>24h volume</Text>
                    <Text style={styles.statValue}>
                      {marketDetails.totalVolume}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Right: sparkline chart */}
            {sparklinePoints ? (
              <View style={styles.chartCol}>
                <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                  <Polyline
                    points={sparklinePoints}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Row 3 — QR + branding */}
          <View style={styles.footerRow}>
            {deeplink ? (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={deeplink}
                  size={44}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            ) : null}
            <View style={styles.branding}>
              <Text style={styles.brandName}>MetaMask</Text>
              <Text style={styles.brandTagline}>
                {i18n.t('share_token.branding_tagline')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Share action circles ── */}
        <View style={styles.actionsRow}>
          {SHARE_APP_DEFINITIONS.filter((app) =>
            installedAppIds.includes(app.id),
          ).map((app) => (
            <ShareCircle
              key={app.id}
              label={app.label}
              bgColor={app.bgColor}
              iconName={app.icon}
              onPress={() => handleAppShare(app.buildShareUrl)}
            />
          ))}
          <ShareCircle
            label={i18n.t('share_token.copy')}
            bgColor={darkTheme.colors.background.alternative}
            iconName={IconName.Copy}
            iconColor={IconColor.IconDefault}
            large
            onPress={handleCopy}
          />
          <ShareCircle
            label={isCapturing ? '…' : i18n.t('share_token.more')}
            bgColor={darkTheme.colors.background.alternative}
            iconName={IconName.MoreHorizontal}
            iconColor={IconColor.IconDefault}
            large
            onPress={handleMore}
          />
        </View>
      </Box>
    </BottomSheet>
  );
};

export default ShareTokenSheet;
