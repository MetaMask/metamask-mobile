import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { zeroAddress } from 'ethereumjs-util';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  selectChainId,
  selectEvmTicker,
  selectNetworkConfigurationByChainId,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import { useTheme } from '../../../../util/theme';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectProviderConfig } from '../../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import useIsOriginalNativeTokenSymbol from '../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { RootState } from '../../../../reducers';
import {
  selectConversionRate,
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { PositionType } from '@metamask/assets-controllers/dist/DeFiPositionsController/fetch-positions.cjs';
import { ProtocolTokenWithMarketValue } from '@metamask/assets-controllers/dist/DeFiPositionsController/group-positions.cjs';
import { selectShowFiatInTestnets } from '../../../../selectors/settings';
import {
  isLineaMainnetByChainId,
  isMainnetByChainId,
} from '../../../../util/networks';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../../selectors/tokenRatesController';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { safeToChecksumAddress } from '../../../../util/address';
import createStyles from '../styles';
import { getTestNetImageByChainId, isTestNet } from '../../../../util/networks';
import images from 'images/image-icons';
import { CustomNetworkImgMapping } from '../../../../util/networks/customNetworks';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';

interface DeFiProtocolPositionListItemProps {
  chainId: Hex;
  protocolId: string;
  protocolDetails: { name: string; iconUrl: string };
  aggregatedMarketValue: number;
  positionTypes: {
    [key in PositionType]?: {
      aggregatedMarketValue: number;
      positions: ProtocolTokenWithMarketValue[][];
    };
  };
  privacyMode: boolean;
}

export const DeFiProtocolPositionListItem = React.memo(
  ({
    chainId,
    protocolDetails,
    aggregatedMarketValue,
    positionTypes,
    privacyMode,
  }: DeFiProtocolPositionListItemProps) => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const selectedInternalAccountAddress = useSelector(
      selectSelectedInternalAccountAddress,
    );

    const { type } = useSelector(selectProviderConfig);
    const selectedChainId = useSelector(selectChainId);
    const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
    const ticker = useSelector(selectEvmTicker);

    const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
      chainId,
      ticker,
      type,
    );
    const networkConfigurationByChainId = useSelector((state: RootState) =>
      selectNetworkConfigurationByChainId(state, chainId),
    );
    const primaryCurrency = useSelector(
      (state: RootState) => state.settings.primaryCurrency,
    );
    const currentCurrency = useSelector(selectCurrentCurrency);
    const networkConfigurations = useSelector(selectNetworkConfigurations);
    const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

    // single chain
    const singleTokenExchangeRates = useSelector(selectContractExchangeRates);
    const singleTokenConversionRate = useSelector(selectConversionRate);

    // multi chain
    const multiChainTokenBalance = useSelector(selectTokensBalances);
    const multiChainMarketData = useSelector(selectTokenMarketData);
    const multiChainCurrencyRates = useSelector(selectCurrencyRates);

    const styles = createStyles(colors);

    const isMainnet = isMainnetByChainId(chainId);
    const isLineaMainnet = isLineaMainnetByChainId(chainId);

    const networkBadgeSource = useMemo<string | undefined>(() => {
      if (isTestNet(chainId)) {
        return getTestNetImageByChainId(chainId);
      }

      if (isMainnet) {
        return images.ETHEREUM;
      }

      if (isLineaMainnet) return images['LINEA-MAINNET'];

      if (CustomNetworkImgMapping[chainId]) {
        return CustomNetworkImgMapping[chainId];
      }

      return ticker ? images[ticker] : undefined;
    }, [chainId, isMainnet, isLineaMainnet, ticker]);

    const onItemPress = (
      protocolId: string,
      protocolDetails: { name: string; iconUrl: string },
      aggregatedMarketValue: number,
      positionTypes: {
        [key in PositionType]?: {
          aggregatedMarketValue: number;
          positions: ProtocolTokenWithMarketValue[][];
        };
      },
      privacyMode: boolean,
    ) => {
      navigation.navigate('DeFiPositions', {
        protocolId,
        protocolDetails,
        aggregatedMarketValue,
        positionTypes,
        privacyMode,
      });
    };

    const badge = useMemo(() => {
      return (
        <BadgeWrapper
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource(chainId as Hex)}
              name={networkConfigurationByChainId?.name}
            />
          }
        >
          {renderNetworkAvatar()}
        </BadgeWrapper>
      );
    }, []);

    const renderNetworkAvatar = useCallback(() => {
      if (!isPortfolioViewEnabled() && asset.isETH) {
        return <NetworkMainAssetLogo style={styles.ethLogo} />;
      }

      if (isPortfolioViewEnabled() && asset.isNative) {
        return (
          <NetworkAssetLogo
            chainId={chainId as Hex}
            style={styles.ethLogo}
            ticker={asset.ticker || ''}
            big={false}
            biggest={false}
            testID={'PLACE HOLDER'}
          />
        );
      }

      return (
        <AvatarToken
          name={asset.symbol}
          imageSource={{ uri: asset.image }}
          size={AvatarSize.Md}
        />
      );
    }, [
      asset.ticker,
      asset.isETH,
      asset.image,
      asset.symbol,
      asset.isNative,
      styles.ethLogo,
      chainId,
    ]);

    return (
      <AssetElement
        // assign staked asset a unique key
        key={asset.isStaked ? '0x_staked' : itemAddress || '0x'}
        onPress={onItemPress}
        onLongPress={asset.isETH || asset.isNative ? null : showRemoveMenu}
        asset={asset}
        balance={secondaryBalance}
        mainBalance={mainBalance}
        privacyMode={privacyMode}
      >
        {showNetworkBadge ? (
          <BadgeWrapper
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={networkBadgeSource(chainId as Hex)}
                name={networkConfigurationByChainId?.name}
              />
            }
          >
            {renderNetworkAvatar()}
          </BadgeWrapper>
        ) : (
          renderNetworkAvatar()
        )}
        <View style={styles.balances}>
          {/*
           * The name of the token must callback to the symbol
           * The reason for this is that the wallet_watchAsset doesn't return the name
           * more info: https://docs.metamask.io/guide/rpc-api.html#wallet-watchasset
           */}
          <View style={styles.assetName}>
            <Text variant={TextVariant.BodyLGMedium}>
              {asset.name || asset.symbol}
            </Text>
            {/** Add button link to Portfolio Stake if token is supported ETH chain and not a staked asset */}
            {asset.isETH && isStakingSupportedChain && !asset.isStaked && (
              <StakeButton asset={asset} />
            )}
          </View>
          {!isTestNet(chainId) && showPercentageChange ? (
            <PercentageChange value={pricePercentChange1d} />
          ) : null}
        </View>
        <ScamWarningIcon
          asset={asset}
          setShowScamWarningModal={setShowScamWarningModal}
        />
        <ScamWarningModal
          showScamWarningModal={showScamWarningModal}
          setShowScamWarningModal={setShowScamWarningModal}
        />
      </AssetElement>
    );
  },
);
