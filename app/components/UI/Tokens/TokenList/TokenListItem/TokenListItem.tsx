import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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
import AssetElement from '../../../AssetElement';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { TokenI } from '../../types';
import { ScamWarningIcon } from './ScamWarningIcon/ScamWarningIcon';
import { FlashListAssetKey } from '../TokenList';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import {
  selectStablecoinLendingEnabledFlag,
  selectMerklCampaignClaimingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { selectAsset } from '../../../../../selectors/assets/assets-list';
import Tag from '../../../../../component-library/components/Tags/Tag';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { NetworkBadgeSource } from '../../../TokenDetails/components/AssetOverview/Balance/Balance';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import { ACCOUNT_TYPE_LABELS } from '../../../../../constants/account-type-labels';

import { selectIsStakeableToken } from '../../../Stake/selectors/stakeableTokens';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';
import { fontStyles } from '../../../../../styles/common';
import { Colors } from '../../../../../util/theme/models';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { toHex } from '@metamask/controller-utils';
import Logger from '../../../../../util/Logger';
import { useMusdCtaVisibility } from '../../../Earn/hooks/useMusdCtaVisibility';
import { useNetworkName } from '../../../../Views/confirmations/hooks/useNetworkName';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';
import {
  useMerklRewards,
  isEligibleForMerklRewards,
} from '../../../Earn/components/MerklRewards/hooks/useMerklRewards';

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
    assetName: {
      flexDirection: 'row',
      gap: 8,
    },
    percentageChange: {
      flexDirection: 'row',
      alignItems: 'center',
      alignContent: 'center',
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
    const { trackEvent, createEventBuilder } = useMetrics();
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

    const chainId = asset?.chainId as Hex;

    const networkName = useNetworkName(chainId);

    const { getEarnToken } = useEarnTokens();

    // Earn feature flags
    const isStablecoinLendingEnabled = useSelector(
      selectStablecoinLendingEnabledFlag,
    );

    const { shouldShowTokenListItemCta } = useMusdCtaVisibility();
    const { getMusdOutputChainId } = useMusdConversionTokens();
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
    const { claimableReward } = useMerklRewards({
      asset,
    });

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

    const hasClaimableBonus = Boolean(
      isMerklCampaignClaimingEnabled && claimableReward && isEligibleForMerkl,
    );

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
          outputChainId: getMusdOutputChainId(assetChainId),
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
      getMusdOutputChainId,
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
        trackEvent(
          createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
            .addProperties({
              source: isFullView
                ? 'mobile-token-list-page'
                : 'mobile-token-list',
              chain_id: token.chainId,
              token_symbol: token.symbol,
            })
            .build(),
        );

        navigation.navigate('Asset', {
          ...token,
          scrollToMerklRewards,
        });
      },
      [isFullView, trackEvent, createEventBuilder, navigation],
    );

    const secondaryBalanceDisplay = useMemo(() => {
      if (hasClaimableBonus) {
        return {
          text: strings('earn.claim_bonus'),
          color: TextColor.Primary,
          onPress: asset ? () => onItemPress(asset as TokenI, true) : undefined,
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
      asset,
      onItemPress,
      handleConvertToMUSD,
      hasPercentageChange,
      pricePercentChange1d,
      shouldShowConvertToMusdCta,
    ]);

    const earnToken = getEarnToken(asset as TokenI);

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

      const shouldShowStablecoinLendingCta =
        earnToken && isStablecoinLendingEnabled;

      if (shouldShowStakeCta || shouldShowStablecoinLendingCta) {
        // TODO: Rename to EarnCta
        return <StakeButton asset={asset} />;
      }
    }, [
      asset,
      earnToken,
      isStablecoinLendingEnabled,
      isStakeable,
      shouldShowConvertToMusdCta,
    ]);

    if (!asset || !chainId) {
      return null;
    }

    const label = asset.accountType
      ? ACCOUNT_TYPE_LABELS[asset.accountType]
      : undefined;

    return (
      <AssetElement
        onPress={onItemPress}
        onLongPress={asset.isNative ? null : showRemoveMenu}
        asset={asset}
        balance={asset.balanceFiat}
        secondaryBalance={secondaryBalanceDisplay.text}
        secondaryBalanceColor={secondaryBalanceDisplay.color}
        privacyMode={privacyMode}
        hideSecondaryBalanceInPrivacyMode={false}
        onSecondaryBalancePress={secondaryBalanceDisplay.onPress}
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
          <View style={styles.assetName}>
            <Text variant={TextVariant.BodyMDMedium} numberOfLines={1}>
              {asset.name || asset.symbol}
            </Text>
            {label && <Tag label={label} testID={ACCOUNT_TYPE_LABEL_TEST_ID} />}
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
            {renderEarnCta()}
          </View>
        </View>
        <ScamWarningIcon
          asset={asset as TokenI & { chainId: string }}
          setShowScamWarningModal={setShowScamWarningModal}
        />
      </AssetElement>
    );
  },
);

TokenListItem.displayName = 'TokenListItem';
