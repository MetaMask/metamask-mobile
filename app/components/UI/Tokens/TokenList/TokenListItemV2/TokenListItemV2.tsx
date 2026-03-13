import { CaipAssetType, Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
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
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { TokenI } from '../../types';
import { ScamWarningIcon } from '../TokenListItem/ScamWarningIcon/ScamWarningIcon';
import useIsOriginalNativeTokenSymbol from '../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { FlashListAssetKey } from '../TokenList';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectMusdQuickConvertEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../Earn/hooks/useMusdConversionEligibility';
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

import { selectIsStakeableToken } from '../../../Stake/selectors/stakeableTokens';
import { Colors } from '../../../../../util/theme/models';
import { strings } from '../../../../../../locales/i18n';
import { useRWAToken } from '../../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../../Bridge/types';
import Routes from '../../../../../constants/navigation/Routes';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import StockBadge from '../../../shared/StockBadge';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { toHex } from '@metamask/controller-utils';
import Logger from '../../../../../util/Logger';
import { useNetworkName } from '../../../../Views/confirmations/hooks/useNetworkName';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events';
import { MUSD_CONVERSION_APY, isMusdToken } from '../../../Earn/constants/musd';
import { useMerklBonusClaim } from '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import { EVENT_LOCATIONS as EARN_EVENT_LOCATIONS } from '../../../Earn/constants/events/earnEvents';
import { useStablecoinLendingRedirect } from '../../../Earn/hooks/useStablecoinLendingRedirect';
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
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { addCurrencySymbol } from '../../../../../util/number';
import { safeToChecksumAddress } from '../../../../../util/address';
import generateTestId from '../../../../../../wdio/utils/generateTestId';
import { getAssetTestId } from '../../../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
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
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../../Earn/types/musd.types';

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
      gap: 8,
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

interface TokenListItemV2Props {
  assetKey: FlashListAssetKey;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (chainId: string | null) => void;
  privacyMode: boolean;
  showPercentageChange?: boolean;
  isFullView?: boolean;
  shouldShowTokenListItemCta: (asset?: TokenI) => boolean;
}

export const TokenListItemV2 = React.memo(
  ({
    assetKey,
    showRemoveMenu,
    setShowScamWarningModal,
    privacyMode,
    showPercentageChange = true,
    isFullView = false,
    shouldShowTokenListItemCta,
  }: TokenListItemV2Props) => {
    const { trackEvent, createEventBuilder } = useAnalytics();
    const navigation = useNavigation();
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

    const networkName = useNetworkName(chainId);

    const isStablecoinLendingEnabled = useSelector(
      selectStablecoinLendingEnabledFlag,
    );

    const isQuickConvertEnabled = useSelector(
      selectMusdQuickConvertEnabledFlag,
    );

    const isMusdConversionFlowEnabled = useSelector(
      selectIsMusdConversionFlowEnabledFlag,
    );
    const { isEligible: isMusdGeoEligible } = useMusdConversionEligibility();

    const { getEarnToken } = useEarnTokens();

    const earnToken = getEarnToken(asset as TokenI);

    const { initiateCustomConversion, hasSeenConversionEducationScreen } =
      useMusdConversion();

    const shouldShowConvertToMusdCta = useMemo(
      () => shouldShowTokenListItemCta(asset),
      [asset, shouldShowTokenListItemCta],
    );

    const merklClaimData = useMerklBonusClaim(asset);
    const { claimRewards, claimableReward, hasPendingClaim } = merklClaimData;

    const hasClaimableBonus = !!claimableReward && !hasPendingClaim;

    const handleClaimBonus = useCallback(() => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
          .addProperties({
            location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.TOKEN_LIST_ITEM,
            action_type: 'claim_bonus',
            button_text: strings('earn.claim_bonus'),
            network_chain_id: asset?.chainId,
            network_name: networkName,
            asset_symbol: asset?.symbol,
          })
          .build(),
      );
      claimRewards();
    }, [
      trackEvent,
      createEventBuilder,
      asset?.chainId,
      asset?.symbol,
      networkName,
      claimRewards,
    ]);

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

    const handleConvertToMUSD = useCallback(async () => {
      const submitCtaPressedEvent = () => {
        const { MUSD_CTA_TYPES, EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

        const getRedirectLocation = () => {
          if (!hasSeenConversionEducationScreen) {
            return EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN;
          }

          return isQuickConvertEnabled
            ? EVENT_LOCATIONS.QUICK_CONVERT_HOME_SCREEN
            : EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN;
        };

        trackEvent(
          createEventBuilder(MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED)
            .addProperties({
              location: EVENT_LOCATIONS.TOKEN_LIST_ITEM,
              redirects_to: getRedirectLocation(),
              cta_type: MUSD_CTA_TYPES.SECONDARY,
              cta_text: strings(
                'earn.musd_conversion.get_a_percentage_musd_bonus',
                {
                  percentage: MUSD_CONVERSION_APY,
                },
              ),
              network_chain_id: chainId,
              network_name: networkName,
              asset_symbol: asset?.symbol,
            })
            .build(),
        );
      };

      try {
        submitCtaPressedEvent();

        if (!asset?.address || !asset?.chainId) {
          throw new Error('Asset address or chain ID is not set');
        }

        const assetChainId = toHex(asset.chainId);

        await initiateCustomConversion({
          preferredPaymentToken: {
            address: toHex(asset.address),
            chainId: assetChainId,
          },
          navigationStack: Routes.EARN.ROOT,
          navigationOverride: MUSD_CONVERSION_NAVIGATION_OVERRIDE.QUICK_CONVERT,
        });
      } catch (error) {
        Logger.error(
          error as Error,
          '[mUSD Conversion] Failed to initiate conversion',
        );
      }
    }, [
      asset?.address,
      asset?.chainId,
      asset?.symbol,
      chainId,
      createEventBuilder,
      hasSeenConversionEducationScreen,
      initiateCustomConversion,
      isQuickConvertEnabled,
      networkName,
      trackEvent,
    ]);

    // Secondary balance shows percentage change (if available and not on testnet)
    const hasPercentageChange =
      !isTestNet(chainId) &&
      showPercentageChange &&
      pricePercentChange1d !== null &&
      pricePercentChange1d !== undefined &&
      Number.isFinite(pricePercentChange1d);

    const onItemPress = useCallback(
      (token: TokenI, scrollToMerklRewards?: boolean) => {
        trace({ name: TraceName.AssetDetails });
        navigation.navigate('Asset', {
          ...token,
          scrollToMerklRewards,
          source: isFullView
            ? TokenDetailsSource.MobileTokenListPage
            : TokenDetailsSource.MobileTokenList,
        });
      },
      [isFullView, navigation],
    );

    const handleLendingRedirect = useStablecoinLendingRedirect({
      asset: asset as TokenI,
      location: EARN_EVENT_LOCATIONS.HOME_SCREEN,
    });

    const secondaryBalanceDisplay = useMemo(() => {
      if (hasClaimableBonus) {
        return {
          text: strings('earn.claim_bonus'),
          color: CLTextColor.Primary,
          onPress: handleClaimBonus,
        };
      }

      // mUSD with no claimable bonus: show green "3% bonus" (not clickable)
      if (
        isMusdConversionFlowEnabled &&
        isMusdGeoEligible &&
        asset &&
        isMusdToken(asset.address)
      ) {
        return {
          text: strings('earn.musd_conversion.percentage_bonus', {
            percentage: MUSD_CONVERSION_APY,
          }),
          color: CLTextColor.Success,
          onPress: undefined,
        };
      }

      if (shouldShowConvertToMusdCta) {
        return {
          text: strings('earn.musd_conversion.get_a_percentage_musd_bonus', {
            percentage: MUSD_CONVERSION_APY,
          }),
          color: CLTextColor.Primary,
          onPress: handleConvertToMUSD,
        };
      }

      if (
        isStablecoinLendingEnabled &&
        earnToken?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING
      ) {
        return {
          text: `${strings('stake.earn')}`,
          color: CLTextColor.Primary,
          onPress: handleLendingRedirect,
        };
      }

      if (!hasPercentageChange) {
        return {
          text: undefined,
          color: CLTextColor.Alternative,
          onPress: undefined,
        };
      }

      const text = `${pricePercentChange1d >= 0 ? '+' : ''}${pricePercentChange1d.toFixed(
        2,
      )}%`;

      let color = CLTextColor.Alternative;
      if (pricePercentChange1d > 0) {
        color = CLTextColor.Success;
      } else if (pricePercentChange1d < 0) {
        color = CLTextColor.Error;
      }

      return { text, color, onPress: undefined };
    }, [
      isMusdConversionFlowEnabled,
      isMusdGeoEligible,
      hasClaimableBonus,
      shouldShowConvertToMusdCta,
      isStablecoinLendingEnabled,
      earnToken?.experience?.type,
      hasPercentageChange,
      pricePercentChange1d,
      asset,
      handleClaimBonus,
      handleConvertToMUSD,
      handleLendingRedirect,
    ]);

    const networkBadgeSource = useMemo(
      () => (chainId ? NetworkBadgeSource(chainId) : null),
      [chainId],
    );

    const isStakeable = useSelector((state: RootState) =>
      selectIsStakeableToken(state, asset as TokenI),
    );

    const renderEarnCta = useCallback(() => {
      // For convertible stablecoins, we display the CTA in the AssetElement's secondary balance
      if (!asset || shouldShowConvertToMusdCta) {
        return null;
      }

      const shouldShowStakeCta = isStakeable && !asset?.isStaked;

      if (shouldShowStakeCta) {
        // TODO: Rename to EarnCta
        return <StakeButton asset={asset} />;
      }
    }, [asset, isStakeable, shouldShowConvertToMusdCta]);

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

    return (
      <TouchableOpacity
        onPress={() => {
          onItemPress?.(asset);
        }}
        onLongPress={() => {
          const onLongPress =
            asset.isNative || isMusdToken(asset.address)
              ? null
              : showRemoveMenu;
          onLongPress?.(asset);
        }}
        style={styles.itemWrapper}
        {...generateTestId(Platform, getAssetTestId(asset.symbol))}
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
                    : CLTextVariant.BodyMDBold
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
            {/* Token price and percentage change — or claim bonus CTA */}
            <View style={styles.percentageChange}>
              {merklClaimData.isClaiming ? (
                <Spinner />
              ) : (
                <>
                  {!hasClaimableBonus && (
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextAlternative}
                      twClassName="uppercase"
                    >
                      {tokenPriceInFiat && !hideFiatForScamWarning
                        ? addCurrencySymbol(
                            tokenPriceInFiat,
                            currentCurrency,
                            true,
                            true,
                          )
                        : '-'}
                      {' \u2022 '}
                    </Text>
                  )}

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
                </>
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

TokenListItemV2.displayName = 'TokenListItemV2';
