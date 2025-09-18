import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
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
import { useStakingChainByChainId } from '../../../Stake/hooks/useStakingChain';
import createStyles from '../../styles';
import { TokenI } from '../../types';
import { ScamWarningIcon } from '../ScamWarningIcon';
import { FlashListAssetKey } from '..';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { selectAsset } from '../../../../../selectors/assets/assets-list';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';

interface TokenListItemProps {
  assetKey: FlashListAssetKey;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (arg: boolean) => void;
  privacyMode: boolean;
  showPercentageChange?: boolean;
}

export const TokenListItemBip44 = React.memo(
  ({
    assetKey,
    showRemoveMenu,
    setShowScamWarningModal,
    privacyMode,
    showPercentageChange = true,
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

    const { getEarnToken } = useEarnTokens();

    // Earn feature flags
    const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
    const isStablecoinLendingEnabled = useSelector(
      selectStablecoinLendingEnabledFlag,
    );

    const pricePercentChange1d = useTokenPricePercentageChange(asset);

    // Secondary balance shows percentage change (if available and not on testnet)
    const hasPercentageChange =
      !isTestNet(chainId) &&
      showPercentageChange &&
      pricePercentChange1d !== null &&
      pricePercentChange1d !== undefined &&
      Number.isFinite(pricePercentChange1d);

    // Determine the color for percentage change
    let percentageColor = TextColor.Alternative;
    if (hasPercentageChange) {
      if (pricePercentChange1d === 0) {
        percentageColor = TextColor.Alternative;
      } else if (pricePercentChange1d > 0) {
        percentageColor = TextColor.Success;
      } else {
        percentageColor = TextColor.Error;
      }
    }

    const percentageText = hasPercentageChange
      ? `${pricePercentChange1d >= 0 ? '+' : ''}${pricePercentChange1d.toFixed(
          2,
        )}%`
      : undefined;

    const { isStakingSupportedChain } = useStakingChainByChainId(chainId);
    const earnToken = getEarnToken(asset as TokenI);

    const networkBadgeSource = useMemo(
      () => NetworkBadgeSource(chainId),
      [chainId],
    );

    const onItemPress = (token: TokenI) => {
      trace({ name: TraceName.AssetDetails });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_OPENED)
          .addProperties({
            source: 'mobile-token-list',
            chain_id: token.chainId,
            token_symbol: token.symbol,
          })
          .build(),
      );

      navigation.navigate('Asset', {
        ...token,
      });
    };

    const renderEarnCta = useCallback(() => {
      if (!asset) {
        return null;
      }
      const isCurrentAssetEth =
        asset.isNative && asset.chainId?.startsWith('eip') && !asset.isStaked;
      const shouldShowPooledStakingCta =
        isCurrentAssetEth && isStakingSupportedChain && isPooledStakingEnabled;

      const shouldShowStablecoinLendingCta =
        earnToken && isStablecoinLendingEnabled;

      if (shouldShowPooledStakingCta || shouldShowStablecoinLendingCta) {
        // TODO: Rename to EarnCta
        return <StakeButton asset={asset} />;
      }
    }, [
      asset,
      earnToken,
      isPooledStakingEnabled,
      isStablecoinLendingEnabled,
      isStakingSupportedChain,
    ]);

    if (!asset || !chainId) {
      return null;
    }

    return (
      <AssetElement
        onPress={onItemPress}
        onLongPress={asset.isNative ? null : showRemoveMenu}
        asset={asset}
        balance={asset.balanceFiat}
        secondaryBalance={percentageText}
        secondaryBalanceColor={percentageColor}
        privacyMode={privacyMode}
        hideSecondaryBalanceInPrivacyMode={false}
      >
        <BadgeWrapper
          style={styles.badge}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource}
            />
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
            {/** Add button link to Portfolio Stake if token is supported ETH chain and not a staked asset */}
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

TokenListItemBip44.displayName = 'TokenListItemBip44';
