import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CaipAssetType, Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { RootState } from '../../../../../reducers';
import { isTestNet } from '../../../../../util/networks';
import { useTheme } from '../../../../../util/theme';
import { TraceName, trace } from '../../../../../util/trace';
import { TokenI } from '../../types';
import { ScamWarningIcon } from './ScamWarningIcon/ScamWarningIcon';
import useIsOriginalNativeTokenSymbol from '../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { FlashListAssetKey } from '../TokenList';
import { useMusdBonusTokenListItem } from '../../../Earn/hooks/useMusdBonusTokenListItem';
import { useMusdConversionTokenListItem } from '../../../Earn/hooks/useMusdConversionTokenListItem';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { selectAsset } from '../../../../../selectors/assets/assets-list';
import Tag from '../../../../../component-library/components/Tags/Tag';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextColor as CLTextColor,
  TextVariant as CLTextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import { ACCOUNT_TYPE_LABELS } from '../../../../../constants/account-type-labels';
import { Colors } from '../../../../../util/theme/models';
import { useRWAToken } from '../../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../../Bridge/types';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import StockBadge from '../../../shared/StockBadge';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain/multichain';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import {
  selectNativeCurrencyByChainId,
  selectProviderType,
} from '../../../../../selectors/networkController';
import { selectTokenListSecurityBadgesEnabled } from '../../../../../selectors/featureFlagController/tokenListSecurityBadges';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import {
  getNativeTokenAddress,
  type TokenSecurityData,
} from '@metamask/assets-controllers';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';
import { safeToChecksumAddress } from '../../../../../util/address';
import { getAssetTestId } from '../../../../../../tests/selectors/Wallet/WalletView.selectors';
import SkeletonText from '../../../Ramp/Aggregator/components/SkeletonText';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../constants';
import {
  BALANCE_TEST_ID,
  SECONDARY_BALANCE_BUTTON_TEST_ID,
  SECONDARY_BALANCE_TEST_ID,
} from '../../../AssetElement/index.constants';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import TokenListSecurityBadge from '../../components/TokenListSecurityBadge/TokenListSecurityBadge';
import { tokenListSecurityBadgeKeys } from '../../queries/tokenSecurityBadgeKeys';
import { getCaipAssetIdForToken } from '../../util/getCaipAssetIdForToken';

export const ACCOUNT_TYPE_LABEL_TEST_ID = 'account-type-label';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    badge: {
      marginTop: 8,
    },
    assetNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    assetName: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
    },
    assetNameText: {
      flexShrink: 1,
    },
    percentageChange: {
      flexDirection: 'row',
      alignItems: 'center',
      alignContent: 'center',
    },
    stockBadgeWrapper: {
      marginLeft: 4,
    },
    itemWrapper: {
      flexDirection: 'row',
      height: 64,
      alignItems: 'center',
    },
    skeleton: {
      width: 50,
    },
    secondaryBalance: {
      color: colors.text.alternative,
      paddingHorizontal: 0,
      textAlign: 'right',
    },
  });

interface TokenListItemProps {
  assetKey: FlashListAssetKey;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (chainId: string | null) => void;
  privacyMode: boolean;
  showPercentageChange?: boolean;
  isFullView?: boolean;
  shouldShowTokenListItemCta: (asset?: TokenI) => boolean;
  /**
   * When true, mUSD rows render only the native balance on the secondary row
   * (no token price / 24h change). Used by the Money Hub.
   */
  hideSecondaryPriceRow?: boolean;
}

export const TokenListItem = React.memo(
  ({
    assetKey,
    showRemoveMenu,
    setShowScamWarningModal,
    privacyMode,
    showPercentageChange = true,
    isFullView = false,
    shouldShowTokenListItemCta,
    hideSecondaryPriceRow = false,
  }: TokenListItemProps) => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const tokenMarketData = useSelector(selectTokenMarketData);
    const currencyRates = useSelector(selectCurrencyRates);

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
    ///: END:ONLY_INCLUDE_IF

    const asset = useSelector((state: RootState) =>
      selectAsset(state, {
        address: assetKey.address,
        chainId: assetKey.chainId as string,
        isStaked: assetKey.isStaked,
      }),
    );

    const { isStockToken } = useRWAToken();

    const basicFunctionalityEnabled = useSelector(
      (state: RootState) => state.settings.basicFunctionalityEnabled,
    );

    const isTokenListSecurityBadgesEnabled = useSelector(
      selectTokenListSecurityBadgesEnabled,
    );

    const skipTokenListSecurityBadge = useMemo(() => {
      if (!asset) {
        return true;
      }
      return isStockToken(asset as BridgeToken);
    }, [asset, isStockToken]);

    const shouldResolveCaipForSecurityBadge =
      basicFunctionalityEnabled &&
      isTokenListSecurityBadgesEnabled &&
      !skipTokenListSecurityBadge;

    const { data: caipAssetIdForSecurity } = useQuery({
      queryKey: tokenListSecurityBadgeKeys.caipFromToken({
        chainId: asset?.chainId,
        address: asset?.address,
        isNative: asset?.isNative,
        isETH: asset?.isETH,
      }),
      queryFn: () => getCaipAssetIdForToken(asset),
      enabled: shouldResolveCaipForSecurityBadge && Boolean(asset?.chainId),
      staleTime: Infinity,
      cacheTime: Infinity,
    });

    const chainId = asset?.chainId as Hex;

    const nativeCurrency = useSelector((state: RootState) =>
      selectNativeCurrencyByChainId(state, chainId),
    );

    const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

    const providerType = useSelector(selectProviderType) ?? '';
    const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
      chainId ?? '',
      asset?.ticker ?? asset?.symbol,
      providerType,
    );
    const showScamWarningIcon =
      isOriginalNativeTokenSymbol === false &&
      (asset?.isNative || asset?.isETH);

    const currentCurrency = useSelector(selectCurrentCurrency);

    // Bonus campaign state: whether the user holds mUSD and should see the
    // campaign APY row (@metamask/earn).
    const { isMusdAsset, bonusSecondaryBalance } = useMusdBonusTokenListItem({
      asset: asset as TokenI | undefined,
    });

    // Conversion CTA state: stablecoin → mUSD conversion prompt and stake
    // button (@metamask/earn).
    const { conversionSecondaryBalance, renderEarnCta } =
      useMusdConversionTokenListItem({
        asset: asset as TokenI | undefined,
        chainId,
        shouldShowTokenListItemCta,
      });

    const pricePercentChange1d = useTokenPricePercentageChange(asset);

    // Calculate token price in fiat currency
    const tokenPriceInFiat = useMemo(() => {
      if (!asset?.address || !asset?.chainId) {
        return undefined;
      }

      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      // Non-EVM: use MultichainAssetsRatesController (rate is already in fiat)
      const multichainRate =
        multichainAssetsRates?.[asset.address as CaipAssetType]?.rate;
      if (multichainRate !== undefined) {
        return multichainRate;
      }
      ///: END:ONLY_INCLUDE_IF

      // EVM: convert token price from native currency to fiat
      if (!nativeCurrency) {
        return undefined;
      }

      if (isTestNet(asset.chainId) && !showFiatOnTestnets) {
        return undefined;
      }

      // Get the checksummed address for market data lookup
      const addressToUse = asset.isNative
        ? getNativeTokenAddress(asset.chainId as Hex)
        : safeToChecksumAddress(asset.address);

      // Token price in native currency: tokenMarketData first, then currencyRates for native
      const marketPriceInNative =
        tokenMarketData?.[asset.chainId as Hex]?.[addressToUse as Hex]?.price;
      const currencyRateAsFiat = currencyRates?.[asset.symbol]?.conversionRate;
      const tokenPriceInNative = marketPriceInNative ?? currencyRateAsFiat;

      if (!tokenPriceInNative) {
        return undefined;
      }

      // currencyRateAsFiat is already in fiat; market price is in native, so convert with nativeToFiatRate
      if (currencyRateAsFiat != null && marketPriceInNative == null) {
        return currencyRateAsFiat;
      }

      const nativeToFiatRate = currencyRates[nativeCurrency]?.conversionRate;
      if (!nativeToFiatRate) {
        return undefined;
      }

      return tokenPriceInNative * nativeToFiatRate;
    }, [
      asset,
      tokenMarketData,
      currencyRates,
      nativeCurrency,
      showFiatOnTestnets,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      multichainAssetsRates,
      ///: END:ONLY_INCLUDE_IF
    ]);

    // Secondary balance: Earn overrides take priority (mUSD CTA, stablecoin
    // lending, etc.); falls back to 24h price change when no Earn state applies.
    const hasPercentageChange =
      !isTestNet(chainId) &&
      showPercentageChange &&
      pricePercentChange1d !== null &&
      pricePercentChange1d !== undefined &&
      Number.isFinite(pricePercentChange1d);

    const secondaryBalanceDisplay = useMemo(() => {
      // Bonus campaign takes highest priority (user holds mUSD, show APY)
      if (bonusSecondaryBalance !== null) {
        return bonusSecondaryBalance;
      }

      // Conversion CTA next (user holds convertible stablecoin)
      if (conversionSecondaryBalance !== null) {
        return conversionSecondaryBalance;
      }

      if (!hasPercentageChange) {
        return {
          text: undefined,
          color: CLTextColor.Alternative,
          onPress: undefined,
        };
      }

      const text = `${pricePercentChange1d >= 0 ? '+' : ''}${pricePercentChange1d.toFixed(2)}%`;

      let color = CLTextColor.Alternative;
      if (pricePercentChange1d > 0) {
        color = CLTextColor.Success;
      } else if (pricePercentChange1d < 0) {
        color = CLTextColor.Error;
      }

      return { text, color, onPress: undefined };
    }, [
      bonusSecondaryBalance,
      conversionSecondaryBalance,
      hasPercentageChange,
      pricePercentChange1d,
    ]);

    const networkBadgeSource = useMemo(
      () => (chainId ? NetworkBadgeSource(chainId) : null),
      [chainId],
    );

    const onItemPress = useCallback(
      (token: TokenI) => {
        trace({ name: TraceName.AssetDetails });

        let securityData: TokenSecurityData | undefined;
        if (shouldResolveCaipForSecurityBadge && caipAssetIdForSecurity) {
          securityData =
            queryClient.getQueryData<TokenSecurityData | null>(
              tokenListSecurityBadgeKeys.byAsset(caipAssetIdForSecurity),
            ) ?? undefined;
        }

        navigation.navigate('Asset', {
          ...token,
          source: isFullView
            ? TokenDetailsSource.MobileTokenListPage
            : TokenDetailsSource.MobileTokenList,
          ...(securityData !== undefined && { securityData }),
        });
      },
      [
        isFullView,
        navigation,
        shouldResolveCaipForSecurityBadge,
        caipAssetIdForSecurity,
        queryClient,
      ],
    );

    if (!asset || !chainId) {
      return null;
    }

    const label = asset.accountType
      ? ACCOUNT_TYPE_LABELS[asset.accountType]
      : undefined;

    const hideFiatForTestnet =
      asset?.chainId != null && isTestNet(asset.chainId) && !showFiatOnTestnets;
    const hideFiatForScamWarning = showScamWarningIcon;
    const fiatBalance = asset.balanceFiat || '—';
    const tokenBalance = `${asset.balance} ${asset.symbol}`;

    const isFiatBalanceLoading =
      fiatBalance === TOKEN_BALANCE_LOADING ||
      fiatBalance === TOKEN_BALANCE_LOADING_UPPERCASE;
    let fiatBalanceDisplay: string | React.ReactNode;
    if (hideFiatForTestnet) {
      fiatBalanceDisplay = '—';
    } else if (isFiatBalanceLoading) {
      fiatBalanceDisplay = <SkeletonText thin style={styles.skeleton} />;
    } else {
      fiatBalanceDisplay = fiatBalance;
    }

    // Money Hub compact mUSD layout: name vertically centered, fiat over
    // native on the right, no price/24h-change row.
    if (hideSecondaryPriceRow && isMusdAsset) {
      return (
        <TouchableOpacity
          onPress={() => onItemPress?.(asset)}
          style={styles.itemWrapper}
          testID={getAssetTestId(asset.symbol)}
        >
          <BadgeWrapper
            style={styles.badge}
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              networkBadgeSource && (
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={networkBadgeSource}
                />
              )
            }
          >
            <AssetLogo asset={asset} />
          </BadgeWrapper>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="flex-1 ml-5 gap-2.5"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              style={styles.assetNameText}
            >
              {asset.name || asset.symbol}
            </Text>
            <Box twClassName="items-end">
              <SensitiveText
                variant={CLTextVariant.BodyMDMedium}
                isHidden={privacyMode}
                length={SensitiveTextLength.Medium}
                testID={BALANCE_TEST_ID}
              >
                {fiatBalanceDisplay}
              </SensitiveText>
              <SensitiveText
                variant={CLTextVariant.BodySMMedium}
                style={styles.secondaryBalance}
                length={SensitiveTextLength.Short}
                isHidden={privacyMode}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tokenBalance}
              </SensitiveText>
            </Box>
          </Box>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => {
          onItemPress?.(asset);
        }}
        onLongPress={() => {
          const onLongPress =
            asset.isNative || isMusdAsset ? null : showRemoveMenu;
          onLongPress?.(asset);
        }}
        style={styles.itemWrapper}
        testID={getAssetTestId(asset.symbol)}
      >
        {/* Column: 1 - Token logo */}
        <BadgeWrapper
          style={styles.badge}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            networkBadgeSource && (
              <Badge
                variant={BadgeVariant.Network}
                imageSource={networkBadgeSource}
              />
            )
          }
        >
          <AssetLogo asset={asset} />
        </BadgeWrapper>

        {/* Column 2*/}
        <Box twClassName="flex-1 ml-5">
          {/* Row: 1 - Token name, label, earn CTA, stock badge */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="gap-2.5"
          >
            {/*
             * Token name and label
             * The name of the token must callback to the symbol
             * The reason for this is that the wallet_watchAsset doesn't return the name
             * more info: https://docs.metamask.io/guide/rpc-api.html#wallet-watchasset
             */}
            <View style={styles.assetNameContainer}>
              <View style={styles.assetName}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  numberOfLines={1}
                  style={styles.assetNameText}
                >
                  {asset.name || asset.symbol}
                </Text>
                {label && (
                  <Tag label={label} testID={ACCOUNT_TYPE_LABEL_TEST_ID} />
                )}
                {shouldResolveCaipForSecurityBadge &&
                  caipAssetIdForSecurity && (
                    <TokenListSecurityBadge
                      caipAssetId={caipAssetIdForSecurity}
                    />
                  )}
              </View>

              {renderEarnCta()}

              {isStockToken(asset as BridgeToken) && (
                <StockBadge
                  style={styles.stockBadgeWrapper}
                  token={asset as BridgeToken}
                />
              )}
            </View>

            {/* Fiat Balance — or scam warning icon when native symbol is not original */}
            {hideFiatForScamWarning ? (
              <ScamWarningIcon
                asset={asset as TokenI & { chainId: string }}
                setShowScamWarningModal={setShowScamWarningModal}
              />
            ) : (
              <SensitiveText
                variant={
                  asset?.hasBalanceError ||
                  asset.balanceFiat === TOKEN_RATE_UNDEFINED ||
                  hideFiatForTestnet
                    ? CLTextVariant.BodySM
                    : CLTextVariant.BodyMDMedium
                }
                isHidden={privacyMode}
                length={SensitiveTextLength.Medium}
                testID={BALANCE_TEST_ID}
              >
                {fiatBalanceDisplay}
              </SensitiveText>
            )}
          </Box>

          {/* Row: 2 - Token price and percentage change and token balance */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="gap-2.5"
          >
            {/* Token price and percentage change */}
            <View style={styles.percentageChange}>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="uppercase"
              >
                {tokenPriceInFiat && !hideFiatForScamWarning
                  ? formatPriceWithSubscriptNotation(
                      tokenPriceInFiat,
                      currentCurrency,
                    )
                  : '-'}
                {' • '}
              </Text>

              {hideFiatForScamWarning ? (
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  twClassName="uppercase"
                >
                  {'-'}
                </Text>
              ) : (
                <TouchableOpacity
                  disabled={!secondaryBalanceDisplay.onPress}
                  onPress={secondaryBalanceDisplay.onPress}
                  testID={SECONDARY_BALANCE_BUTTON_TEST_ID}
                >
                  <SensitiveText
                    variant={CLTextVariant.BodySMMedium}
                    color={secondaryBalanceDisplay.color}
                    isHidden={false}
                    length={SensitiveTextLength.Short}
                    testID={SECONDARY_BALANCE_TEST_ID}
                  >
                    {secondaryBalanceDisplay.text || '-'}
                  </SensitiveText>
                </TouchableOpacity>
              )}
            </View>

            {/* Token balance */}
            <Box twClassName="shrink">
              <SensitiveText
                variant={CLTextVariant.BodySMMedium}
                style={styles.secondaryBalance}
                length={SensitiveTextLength.Short}
                isHidden={privacyMode}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tokenBalance}
              </SensitiveText>
            </Box>
          </Box>
        </Box>
      </TouchableOpacity>
    );
  },
);

TokenListItem.displayName = 'TokenListItem';
