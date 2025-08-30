import { Hex, isCaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import PercentageChange from '../../../../../component-library/components-temp/Price/PercentageChange';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { RootState } from '../../../../../reducers';
import {
  getDefaultNetworkByChainId,
  getTestNetImageByChainId,
  isTestNet,
} from '../../../../../util/networks';
import {
  CustomNetworkImgMapping,
  PopularList,
  UnpopularNetworkList,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../../util/networks/customNetworks';
import { useTheme } from '../../../../../util/theme';
import { TraceName, trace } from '../../../../../util/trace';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import AssetElement from '../../../AssetElement';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { useStakingChainByChainId } from '../../../Stake/hooks/useStakingChain';
import createStyles from '../../styles';
import { TokenI } from '../../types';
import { ScamWarningIcon } from '../ScamWarningIcon';
import { CustomNetworkNativeImgMapping } from './CustomNetworkNativeImgMapping';
import { FlashListAssetKey } from '..';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { selectAsset } from '../../../../../selectors/assets/assets-list';

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

    const primaryCurrency = useSelector(
      (state: RootState) => state.settings.primaryCurrency,
    );

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

    const { isStakingSupportedChain } = useStakingChainByChainId(chainId);
    const earnToken = getEarnToken(asset as TokenI);

    const networkBadgeSource = useCallback(
      (currentChainId: Hex) => {
        if (isTestNet(currentChainId))
          return getTestNetImageByChainId(currentChainId);
        const defaultNetwork = getDefaultNetworkByChainId(currentChainId) as
          | {
              imageSource: string;
            }
          | undefined;

        if (defaultNetwork) {
          return defaultNetwork.imageSource;
        }

        const unpopularNetwork = UnpopularNetworkList.find(
          (networkConfig) => networkConfig.chainId === currentChainId,
        );

        const customNetworkImg = CustomNetworkImgMapping[currentChainId];

        const popularNetwork = PopularList.find(
          (networkConfig) => networkConfig.chainId === currentChainId,
        );

        const network = unpopularNetwork || popularNetwork;
        if (network) {
          return network.rpcPrefs.imageSource;
        }
        if (isCaipChainId(chainId)) {
          return getNonEvmNetworkImageSourceByChainId(chainId);
        }
        if (customNetworkImg) {
          return customNetworkImg;
        }
      },
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

    const renderNetworkAvatar = useCallback(() => {
      if (!asset) {
        return null;
      }
      if (asset.isNative) {
        const isCustomNetwork = CustomNetworkNativeImgMapping[chainId];

        if (isCustomNetwork) {
          return (
            <AvatarToken
              name={asset.symbol}
              imageSource={CustomNetworkNativeImgMapping[chainId]}
              size={AvatarSize.Lg}
            />
          );
        }

        return (
          <NetworkAssetLogo
            chainId={chainId as Hex}
            style={styles.ethLogo}
            ticker={asset.ticker || ''}
            big={false}
            biggest={false}
            testID={asset.name}
          />
        );
      }

      return (
        <AvatarToken
          name={asset.symbol}
          imageSource={{ uri: asset.image }}
          size={AvatarSize.Lg}
        />
      );
    }, [asset, styles.ethLogo, chainId]);

    const renderEarnCta = useCallback(() => {
      if (!asset) {
        return null;
      }
      const isCurrentAssetEth =
        asset.isNative && asset.chainId?.startsWith('eip'); // TODO: Add that it's not staked
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

    const mainBalance =
      primaryCurrency === 'Fiat'
        ? asset.balanceFiat
        : `${asset.balance} ${asset.symbol}`;
    const secondaryBalance =
      primaryCurrency === 'Fiat'
        ? `${asset.balance} ${asset.symbol}`
        : asset.balanceFiat;

    return (
      <AssetElement
        onPress={onItemPress}
        onLongPress={asset.isNative ? null : showRemoveMenu}
        asset={asset}
        balance={mainBalance}
        secondaryBalance={secondaryBalance}
        privacyMode={privacyMode}
      >
        <BadgeWrapper
          style={styles.badge}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource(chainId as Hex)}
            />
          }
        >
          {renderNetworkAvatar()}
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
            {!isTestNet(chainId) && showPercentageChange ? (
              <PercentageChange value={pricePercentChange1d ?? 0} />
            ) : null}
            {renderEarnCta()}
          </View>
        </View>
        <ScamWarningIcon
          asset={asset}
          setShowScamWarningModal={setShowScamWarningModal}
        />
      </AssetElement>
    );
  },
);

TokenListItemBip44.displayName = 'TokenListItemBip44';
