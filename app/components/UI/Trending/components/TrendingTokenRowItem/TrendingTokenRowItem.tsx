import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './TrendingTokenRowItem.styles';
import { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokenLogo from '../TrendingTokenLogo';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { isCaipChainId } from '@metamask/utils';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Icon,
  IconAlert,
  IconSize,
  Text as DesignSystemText,
  TextVariant as DesignSystemTextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { getResultTypeConfig } from '../../../SecurityTrust/utils/securityUtils';
import {
  caipChainIdToHex,
  getCaipChainIdFromAssetId,
  getNetworkBadgeSource,
  formatMarketStats,
  getPriceChangeFieldKey,
} from './utils';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';
import { TimeOption } from '../TrendingTokensBottomSheet';
import { getTrendingTokenImageUrl } from '../../utils/getTrendingTokenImageUrl';
import type { TrendingFilterContext } from '../TrendingTokensList/TrendingTokensList';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { useTrendingTokenPress } from '../../hooks/useTrendingTokenPress/useTrendingTokenPress';

/**
 * Gets the text color for price percentage change
 */
const getPriceChangeColor = (priceChange: number): TextColor => {
  if (priceChange === 0) return TextColor.Default;
  return priceChange > 0 ? TextColor.Success : TextColor.Error;
};

/**
 * Gets the prefix symbol for price percentage change
 */
const getPriceChangePrefix = (
  priceChange: number,
  isPositive: boolean,
): string => {
  if (priceChange === 0) return '';
  return isPositive ? '+' : '-';
};

interface TrendingTokenRowItemProps {
  token: TrendingAsset;
  selectedTimeOption?: TimeOption;
  /** 0-indexed position in the list for analytics */
  position?: number;
  /** Filter context for analytics tracking */
  filterContext?: TrendingFilterContext;
  /**
   * Token Details `source` for MetaMetrics (e.g. Explore trending vs Swaps trending).
   * @default TokenDetailsSource.Trending
   */
  tokenDetailsSource?: TokenDetailsSource;
  /** Passed through to Asset navigation for tx-scoped `active_ab_tests` */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /**
   * Custom press handler. When provided, bypasses default navigation to the
   * asset details screen (including network-add logic and analytics tracking).
   */
  onPress?: (token: TrendingAsset) => void;
  /**
   * When the same token row appears in multiple Explore sections, set this to keep
   * `testID` (and E2E selectors) unique per instance.
   */
  testIdInstanceKey?: string;
}

/**
 * Converts a TrendingAsset to Asset navigation params
 */
export const getAssetNavigationParams = (
  token: TrendingAsset,
  source: TokenDetailsSource,
  transactionActiveAbTests?: TransactionActiveAbTestEntry[],
) => {
  const [caipChainId, assetIdentifier] = token.assetId.split('/');
  if (!isCaipChainId(caipChainId)) return null;

  const isEvmChain = caipChainId.startsWith('eip155:');
  const isNativeToken = assetIdentifier?.startsWith('slip44:');
  const address = isNativeToken
    ? NATIVE_SWAPS_TOKEN_ADDRESS
    : assetIdentifier?.split(':')[1];

  const hexChainId = caipChainIdToHex(caipChainId);

  return {
    chainId: hexChainId,
    address: isEvmChain ? address : token.assetId,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    image: getTrendingTokenImageUrl(token.assetId),
    pricePercentChange1d: token.priceChangePct?.h24
      ? parseFloat(token.priceChangePct.h24)
      : undefined,
    isNative: isNativeToken,
    isETH: isNativeToken && hexChainId === '0x1',
    isFromTrending: true,
    source,
    rwaData: token.rwaData,
    securityData: token.securityData,
    ...(transactionActiveAbTests?.length && { transactionActiveAbTests }),
  };
};

const TrendingTokenRowItem = ({
  token,
  selectedTimeOption = TimeOption.TwentyFourHours,
  position,
  filterContext,
  tokenDetailsSource = TokenDetailsSource.Trending,
  transactionActiveAbTests,
  onPress,
  testIdInstanceKey,
}: TrendingTokenRowItemProps) => {
  const { styles } = useStyles(styleSheet, {});

  const caipChainId = useMemo(
    () => getCaipChainIdFromAssetId(token.assetId),
    [token.assetId],
  );

  const networkBadgeImageSource = useMemo(
    () => getNetworkBadgeSource(caipChainId),
    [caipChainId],
  );

  const securityBadge = useMemo(
    () => getResultTypeConfig(token.securityData?.resultType).badge,
    [token.securityData?.resultType],
  );

  const priceChangeFieldKey = getPriceChangeFieldKey(selectedTimeOption);
  const pricePercentChangeString = token.priceChangePct?.[priceChangeFieldKey];
  const pricePercentChange = pricePercentChangeString
    ? parseFloat(pricePercentChangeString)
    : undefined;

  const hasPercentageChange =
    pricePercentChange !== undefined && !isNaN(pricePercentChange);
  const isPositiveChange = hasPercentageChange && pricePercentChange > 0;

  const { onPress: defaultOnPress } = useTrendingTokenPress({
    token,
    index: position,
    filterContext,
    tokenDetailsSource,
    transactionActiveAbTests,
    selectedTimeOption,
  });

  const handlePress = useCallback(async () => {
    if (onPress) {
      onPress(token);
      return;
    }
    await defaultOnPress();
  }, [onPress, token, defaultOnPress]);

  const rowTestId = testIdInstanceKey
    ? `trending-token-row-item-${testIdInstanceKey}-${token.assetId}`
    : `trending-token-row-item-${token.assetId}`;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID={rowTestId}
    >
      <View>
        <BadgeWrapper
          style={styles.badge}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              size={AvatarSize.Xs}
              variant={BadgeVariant.Network}
              imageSource={networkBadgeImageSource}
              isScaled={false}
            />
          }
        >
          <TrendingTokenLogo
            assetId={token.assetId}
            symbol={token.symbol}
            size={40}
            recyclingKey={token.assetId}
          />
        </BadgeWrapper>
      </View>
      <View style={styles.leftContainer}>
        <View style={styles.tokenHeaderRow}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Default}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.tokenName}
          >
            {token?.name ?? token?.symbol}
          </Text>
          {securityBadge && securityBadge.label === null && (
            <>
              {securityBadge.iconAlertSeverity ? (
                <IconAlert
                  severity={securityBadge.iconAlertSeverity}
                  size={IconSize.Sm}
                  testID="security-badge-icon"
                />
              ) : (
                <Icon
                  name={securityBadge.icon}
                  size={IconSize.Sm}
                  color={securityBadge.iconColor}
                  testID="security-badge-icon"
                />
              )}
            </>
          )}
          {securityBadge && securityBadge.label !== null && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName={`rounded min-w-[22px] px-1.5 gap-1 shrink-0 ${securityBadge.bg}`}
            >
              {securityBadge.iconAlertSeverity ? (
                <IconAlert
                  severity={securityBadge.iconAlertSeverity}
                  size={IconSize.Sm}
                />
              ) : (
                <Icon
                  name={securityBadge.icon}
                  size={IconSize.Sm}
                  color={securityBadge.iconColor}
                />
              )}
              <DesignSystemText
                variant={DesignSystemTextVariant.BodySm}
                color={securityBadge.textColor}
                fontWeight={FontWeight.Medium}
                numberOfLines={1}
                twClassName="whitespace-nowrap"
              >
                {securityBadge.label}
              </DesignSystemText>
            </Box>
          )}
        </View>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {formatMarketStats(
            token.marketCap ?? 0,
            token.aggregatedUsdVolume ?? 0,
          )}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {formatPriceWithSubscriptNotation(token.price)}
        </Text>
        {parseFloat(token.price) === 0 ? (
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            —
          </Text>
        ) : (
          hasPercentageChange && (
            <Text
              variant={TextVariant.BodySM}
              color={getPriceChangeColor(pricePercentChange)}
            >
              {getPriceChangePrefix(pricePercentChange, isPositiveChange)}
              {Math.abs(pricePercentChange).toFixed(2)}%
            </Text>
          )
        )}
      </View>
    </TouchableOpacity>
  );
};

export default TrendingTokenRowItem;
