import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { useSelector } from 'react-redux';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { RootState } from '../../../../../reducers';
import { isTestNet } from '../../../../../util/networks';
import { useTheme } from '../../../../../util/theme';
import { TraceName, trace } from '../../../../../util/trace';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { TokenI } from '../../types';
import { ScamWarningIcon } from '../TokenListItem/ScamWarningIcon/ScamWarningIcon';
import { FlashListAssetKey } from '../TokenList';
import {
  selectMerklCampaignClaimingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { selectAsset } from '../../../../../selectors/assets/assets-list';
import Tag from '../../../../../component-library/components/Tags/Tag';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import { ACCOUNT_TYPE_LABELS } from '../../../../../constants/account-type-labels';

import { selectIsStakeableToken } from '../../../Stake/selectors/stakeableTokens';
import { fontStyles } from '../../../../../styles/common';
import { Colors } from '../../../../../util/theme/models';
import { strings } from '../../../../../../locales/i18n';
import { useRWAToken } from '../../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../../Bridge/types';
import Routes from '../../../../../constants/navigation/Routes';
import { TokenDetailsSource } from '../../../TokenDetails/Views/TokenDetails';
import StockBadge from '../../../shared/StockBadge';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { toHex } from '@metamask/controller-utils';
import Logger from '../../../../../util/Logger';
import { useNetworkName } from '../../../../Views/confirmations/hooks/useNetworkName';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events';
import { MUSD_CONVERSION_APY, isMusdToken } from '../../../Earn/constants/musd';
import { isEligibleForMerklRewards } from '../../../Earn/components/MerklRewards/hooks/useMerklRewards';
import {
  MerklClaimHandler,
  DEFAULT_MERKL_CLAIM_DATA,
  type MerklClaimData,
} from '../../../Earn/components/MerklRewards/hooks/MerklClaimHandler';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import { EVENT_LOCATIONS as EARN_EVENT_LOCATIONS } from '../../../Earn/constants/events/earnEvents';
import { useStablecoinLendingRedirect } from '../../../Earn/hooks/useStablecoinLendingRedirect';
import { useMusdCtaVisibility } from '../../../Earn/hooks/useMusdCtaVisibility';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNativeCurrencyByChainId } from '../../../../../selectors/networkController';
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
} from '@metamask/design-system-react-native';

export const ACCOUNT_TYPE_LABEL_TEST_ID = 'account-type-label';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    balanceFiat: {
      color: colors.text.alternative,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
    badge: {
      marginTop: 8,
    },
    assetNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    assetName: {
      flexDirection: 'row',
      gap: 8,
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
  setShowScamWarningModal: (arg: boolean) => void;
  privacyMode: boolean;
  showPercentageChange?: boolean;
  isFullView?: boolean;
}

export const TokenListItemV2 = React.memo(
  ({
    assetKey,
    showRemoveMenu,
    setShowScamWarningModal,
    privacyMode,
    showPercentageChange = true,
    isFullView = false,
  }: TokenListItemV2Props) => {
    const { trackEvent, createEventBuilder } = useMetrics();
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const tokenMarketData = useSelector(selectTokenMarketData);
    const currencyRates = useSelector(selectCurrencyRates);

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

    const currentCurrency = useSelector(selectCurrentCurrency);

    const networkName = useNetworkName(chainId);

    const isStablecoinLendingEnabled = useSelector(
      selectStablecoinLendingEnabledFlag,
    );

    const { getEarnToken } = useEarnTokens();

    const earnToken = getEarnToken(asset as TokenI);

    const { shouldShowTokenListItemCta } = useMusdCtaVisibility();
    const { initiateConversion, hasSeenConversionEducationScreen } =
      useMusdConversion();

    const shouldShowConvertToMusdCta = useMemo(
      () => shouldShowTokenListItemCta(asset),
      [asset, shouldShowTokenListItemCta],
    );

    // Check for claimable Merkl rewards
    const isMerklCampaignClaimingEnabled = useSelector(
      selectMerklCampaignClaimingEnabledFlag,
    );

    const isEligibleForMerkl = useMemo(
      () =>
        asset?.chainId && asset?.address
          ? isEligibleForMerklRewards(
              asset.chainId as Hex,
              asset.address as Hex | undefined,
            )
          : false,
      [asset?.chainId, asset?.address],
    );

    // Merkl hooks are only mounted for eligible tokens via MerklClaimHandler
    // to avoid unnecessary hook overhead for non-eligible tokens
    const [merklData, setMerklData] = useState<MerklClaimData>(
      DEFAULT_MERKL_CLAIM_DATA,
    );

    const hasClaimableBonus = Boolean(
      isMerklCampaignClaimingEnabled &&
        merklData.claimableReward &&
        isEligibleForMerkl &&
        !merklData.hasPendingClaim,
    );

    const pricePercentChange1d = useTokenPricePercentageChange(asset);

    // Calculate token price in fiat currency
    const tokenPriceInFiat = useMemo(() => {
      if (!asset?.address || !asset?.chainId || !nativeCurrency) {
        return undefined;
      }

      // Get the checksummed address for market data lookup
      const addressToUse = asset.isNative
        ? getNativeTokenAddress(asset.chainId as Hex)
        : safeToChecksumAddress(asset.address);

      // Get token price in native currency (e.g., token price in ETH)
      const tokenPriceInNative =
        tokenMarketData?.[asset.chainId as Hex]?.[addressToUse as Hex]?.price;

      // Get native currency to fiat conversion rate (e.g., ETH to USD)
      const nativeToFiatRate = currencyRates[nativeCurrency]?.conversionRate;

      if (!tokenPriceInNative || !nativeToFiatRate) {
        return undefined;
      }

      // Calculate final fiat price
      return tokenPriceInNative * nativeToFiatRate;
    }, [asset, tokenMarketData, currencyRates, nativeCurrency]);

    const handleConvertToMUSD = useCallback(async () => {
      const submitCtaPressedEvent = () => {
        const { MUSD_CTA_TYPES, EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

        const getRedirectLocation = () =>
          hasSeenConversionEducationScreen
            ? EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN
            : EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN;

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

        await initiateConversion({
          preferredPaymentToken: {
            address: toHex(asset.address),
            chainId: assetChainId,
          },
          navigationStack: Routes.EARN.ROOT,
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
      initiateConversion,
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
          color: TextColor.Primary,
          onPress: merklData.claimRewards,
        };
      }

      if (shouldShowConvertToMusdCta) {
        return {
          text: strings('earn.musd_conversion.get_a_percentage_musd_bonus', {
            percentage: MUSD_CONVERSION_APY,
          }),
          color: TextColor.Primary,
          onPress: handleConvertToMUSD,
        };
      }

      if (
        isStablecoinLendingEnabled &&
        earnToken?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING
      ) {
        return {
          text: `${strings('stake.earn')}`,
          color: TextColor.Primary,
          onPress: handleLendingRedirect,
        };
      }

      if (!hasPercentageChange) {
        return {
          text: undefined,
          color: TextColor.Alternative,
          onPress: undefined,
        };
      }

      const text = `${pricePercentChange1d >= 0 ? '+' : ''}${pricePercentChange1d.toFixed(
        2,
      )}%`;

      let color = TextColor.Alternative;
      if (pricePercentChange1d > 0) {
        color = TextColor.Success;
      } else if (pricePercentChange1d < 0) {
        color = TextColor.Error;
      }

      return { text, color, onPress: undefined };
    }, [
      hasClaimableBonus,
      shouldShowConvertToMusdCta,
      isStablecoinLendingEnabled,
      earnToken?.experience?.type,
      hasPercentageChange,
      pricePercentChange1d,
      merklData.claimRewards,
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

    const fiatBalance = asset.balanceFiat || '—';
    const tokenBalance = `${asset.balance} ${asset.symbol}`;

    return (
      <>
        {isEligibleForMerkl && isMerklCampaignClaimingEnabled && (
          <MerklClaimHandler asset={asset} onDataChange={setMerklData} />
        )}
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
                  <Text variant={TextVariant.BodyMDBold} numberOfLines={1}>
                    {asset.name || asset.symbol}
                  </Text>
                  {label && (
                    <Tag label={label} testID={ACCOUNT_TYPE_LABEL_TEST_ID} />
                  )}
                </View>

                {renderEarnCta()}

                {isStockToken(asset as BridgeToken) && (
                  <StockBadge style={styles.stockBadgeWrapper} token={asset} />
                )}
              </View>

              {/* Fiat Balance */}
              <SensitiveText
                variant={
                  asset?.hasBalanceError ||
                  asset.balanceFiat === TOKEN_RATE_UNDEFINED
                    ? TextVariant.BodySM
                    : TextVariant.BodyMDBold
                }
                isHidden={privacyMode}
                length={SensitiveTextLength.Medium}
                testID={BALANCE_TEST_ID}
              >
                {fiatBalance === TOKEN_BALANCE_LOADING ||
                fiatBalance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                  <SkeletonText thin style={styles.skeleton} />
                ) : (
                  fiatBalance
                )}
              </SensitiveText>
            </Box>

            {/* Row: 2 - Token price and percentage change and token balance */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              twClassName="gap-2.5"
            >
              {/* Token price and percentage change — or claim bonus CTA */}
              <View style={styles.percentageChange}>
                {merklData.isClaiming ? (
                  <Spinner />
                ) : (
                  <>
                    {!hasClaimableBonus && (
                      <Text
                        variant={TextVariant.BodySMMedium}
                        style={styles.balanceFiat}
                      >
                        {tokenPriceInFiat
                          ? addCurrencySymbol(
                              tokenPriceInFiat,
                              currentCurrency,
                              true,
                              true,
                            )
                          : '-'}
                        {' • '}
                      </Text>
                    )}

                    <TouchableOpacity
                      disabled={!secondaryBalanceDisplay.onPress}
                      onPress={secondaryBalanceDisplay.onPress}
                      testID={SECONDARY_BALANCE_BUTTON_TEST_ID}
                    >
                      <SensitiveText
                        variant={TextVariant.BodySMMedium}
                        color={secondaryBalanceDisplay.color}
                        isHidden={false}
                        length={SensitiveTextLength.Short}
                        testID={SECONDARY_BALANCE_TEST_ID}
                      >
                        {secondaryBalanceDisplay.text || '-'}
                      </SensitiveText>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Token balance */}
              <Box twClassName="shrink">
                <SensitiveText
                  variant={TextVariant.BodySMMedium}
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

          {/* Scam warning icon */}
          <ScamWarningIcon
            asset={asset as TokenI & { chainId: string }}
            setShowScamWarningModal={setShowScamWarningModal}
          />
        </TouchableOpacity>
      </>
    );
  },
);

TokenListItemV2.displayName = 'TokenListItemV2';
