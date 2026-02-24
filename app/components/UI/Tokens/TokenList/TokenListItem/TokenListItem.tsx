import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import AssetElement from '../../../AssetElement';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { TokenI } from '../../types';
import { ScamWarningIcon } from './ScamWarningIcon/ScamWarningIcon';
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
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import Routes from '../../../../../constants/navigation/Routes';
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

export const ACCOUNT_TYPE_LABEL_TEST_ID = 'account-type-label';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    balances: {
      flex: 1,
      justifyContent: 'center',
      marginLeft: 20,
    },
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
    centered: {
      textAlign: 'center',
    },
    stockBadgeWrapper: {
      marginLeft: 4,
    },
  });

interface TokenListItemProps {
  assetKey: FlashListAssetKey;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (arg: boolean) => void;
  privacyMode: boolean;
  showPercentageChange?: boolean;
  isFullView?: boolean;
}

export const TokenListItem = React.memo(
  ({
    assetKey,
    showRemoveMenu,
    setShowScamWarningModal,
    privacyMode,
    showPercentageChange = true,
    isFullView = false,
  }: TokenListItemProps) => {
    const { trackEvent, createEventBuilder } = useAnalytics();
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const asset = useSelector((state: RootState) =>
      selectAsset(state, {
        address: assetKey.address,
        chainId: assetKey.chainId as string,
        isStaked: assetKey.isStaked,
      }),
    );

    const { isStockToken } = useRWAToken();

    const chainId = asset?.chainId as Hex;

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

    const { claimRewards } = merklData;
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
      (token: TokenI) => {
        trace({ name: TraceName.AssetDetails });
        navigation.navigate('Asset', {
          ...token,
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
          text: merklData.isClaiming ? undefined : strings('earn.claim_bonus'),
          color: TextColor.Primary,
          onPress: merklData.isClaiming ? undefined : handleClaimBonus,
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
      merklData.isClaiming,
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

    return (
      <>
        {isEligibleForMerkl && isMerklCampaignClaimingEnabled && (
          <MerklClaimHandler asset={asset} onDataChange={setMerklData} />
        )}
        <AssetElement
          onPress={onItemPress}
          onLongPress={
            asset.isNative || isMusdToken(asset.address) ? null : showRemoveMenu
          }
          asset={asset}
          balance={asset.balanceFiat || '—'}
          secondaryBalance={secondaryBalanceDisplay.text || '-'}
          secondaryBalanceColor={secondaryBalanceDisplay.color}
          privacyMode={privacyMode}
          hideSecondaryBalanceInPrivacyMode={false}
          onSecondaryBalancePress={secondaryBalanceDisplay.onPress}
          secondaryBalanceElement={
            isEligibleForMerkl &&
            isMerklCampaignClaimingEnabled &&
            merklData.isClaiming ? (
              <Spinner />
            ) : undefined
          }
        >
          <BadgeWrapper
            style={styles.badge}
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              networkBadgeSource ? (
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={networkBadgeSource}
                />
              ) : null
            }
          >
            <AssetLogo asset={asset} />
          </BadgeWrapper>
          <View style={styles.balances}>
            {/*
             * The name of the token must callback to the symbol
             * The reason for this is that the wallet_watchAsset doesn't return the name
             * more info: https://docs.metamask.io/guide/rpc-api.html#wallet-watchasset
             */}
            <View style={styles.assetNameContainer}>
              <View style={styles.assetName}>
                <Text variant={TextVariant.BodyMDMedium} numberOfLines={1}>
                  {asset.name || asset.symbol}
                </Text>
                {label && (
                  <Tag label={label} testID={ACCOUNT_TYPE_LABEL_TEST_ID} />
                )}
              </View>

              {renderEarnCta()}
            </View>
            <View style={styles.percentageChange}>
              {
                <SensitiveText
                  variant={TextVariant.BodySMMedium}
                  style={styles.balanceFiat}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Short}
                >
                  {asset.balance} {asset.symbol}
                </SensitiveText>
              }
              {isStockToken(asset as BridgeToken) && (
                <StockBadge
                  style={styles.stockBadgeWrapper}
                  token={asset as BridgeToken}
                />
              )}
            </View>
          </View>
          <ScamWarningIcon
            asset={asset as TokenI & { chainId: string }}
            setShowScamWarningModal={setShowScamWarningModal}
          />
        </AssetElement>
      </>
    );
  },
);

TokenListItem.displayName = 'TokenListItem';
