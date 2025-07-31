import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipAssetId,
  CaipChainId,
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
  Hex,
  isCaipChainId,
} from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import I18n, { strings } from '../../../../../../locales/i18n';
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
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectSelectedInternalAccount,
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
  selectSelectedInternalAccountAddress,
} from '../../../../../selectors/accountsController';
import {
  selectCurrencyRateForChainId,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { selectSingleTokenBalance } from '../../../../../selectors/tokenBalancesController';
import { selectSingleTokenPriceMarketData } from '../../../../../selectors/tokenRatesController';
import { formatWithThreshold } from '../../../../../util/assets';
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
import { TOKEN_BALANCE_LOADING, TOKEN_RATE_UNDEFINED } from '../../constants';
import createStyles from '../../styles';
import { TokenI } from '../../types';
import { deriveBalanceFromAssetMarketDetails } from '../../util/deriveBalanceFromAssetMarketDetails';
import { ScamWarningIcon } from '../ScamWarningIcon';
import { CustomNetworkNativeImgMapping } from './CustomNetworkNativeImgMapping';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { makeSelectNonEvmAssetById } from '../../../../../selectors/multichain/multichain';
///: END:ONLY_INCLUDE_IF(keyring-snaps)
import { FlashListAssetKey } from '..';
import { makeSelectAssetByAddressAndChainId } from '../../../../../selectors/multichain';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';

interface TokenListItemProps {
  assetKey: FlashListAssetKey;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (arg: boolean) => void;
  privacyMode: boolean;
  showPercentageChange?: boolean;
}

export const TokenListItem = React.memo(
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

    const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
    const selectedInternalAccountAddress = useSelector(
      selectSelectedInternalAccountAddress,
    );

    const selectEvmAsset = useMemo(makeSelectAssetByAddressAndChainId, []);

    const evmAsset = useSelector((state: RootState) =>
      selectEvmAsset(state, {
        address: assetKey.address,
        chainId: assetKey.chainId ?? '',
        isStaked: assetKey.isStaked,
      }),
    );

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const selectedAccount = useSelector(selectSelectedInternalAccount);
    const selectNonEvmAsset = useMemo(makeSelectNonEvmAssetById, []);

    const nonEvmAsset = useSelector((state: RootState) =>
      selectNonEvmAsset(state, {
        accountId: selectedAccount?.id,
        assetId: assetKey.address as CaipAssetId,
      }),
    );
    ///: END:ONLY_INCLUDE_IF

    let asset = isEvmNetworkSelected ? evmAsset : nonEvmAsset;

    const chainId = asset?.chainId as Hex;

    const primaryCurrency = useSelector(
      (state: RootState) => state.settings.primaryCurrency,
    );
    const currentCurrency = useSelector(selectCurrentCurrency);
    const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

    const { getEarnToken } = useEarnTokens();

    // Earn feature flags
    const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
    const isStablecoinLendingEnabled = useSelector(
      selectStablecoinLendingEnabledFlag,
    );

    const styles = createStyles(colors);

    const pricePercentChange1d = useTokenPricePercentageChange(asset);

    // Market data selectors
    const exchangeRates = useSelector((state: RootState) =>
      selectSingleTokenPriceMarketData(state, chainId, asset?.address as Hex),
    );

    // Token balance selectors
    const tokenBalances = useSelector((state: RootState) =>
      selectSingleTokenBalance(
        state,
        selectedInternalAccountAddress as Hex,
        chainId,
        asset?.address as Hex,
      ),
    );

    const conversionRate = useSelector((state: RootState) =>
      selectCurrencyRateForChainId(state, chainId as Hex),
    );

    const oneHundredths = 0.01;
    const oneHundredThousandths = 0.00001;

    const { balanceFiat, balanceValueFormatted } = useMemo(
      () =>
        isEvmNetworkSelected && asset
          ? deriveBalanceFromAssetMarketDetails(
              asset,
              exchangeRates || {},
              tokenBalances || {},
              conversionRate || 0,
              currentCurrency || '',
            )
          : {
              balanceFiat: asset?.balanceFiat
                ? formatWithThreshold(
                    parseFloat(asset.balanceFiat),
                    oneHundredths,
                    I18n.locale,
                    { style: 'currency', currency: currentCurrency },
                  )
                : TOKEN_BALANCE_LOADING,
              balanceValueFormatted: asset?.balance
                ? formatWithThreshold(
                    parseFloat(asset.balance),
                    oneHundredThousandths,
                    I18n.locale,
                    {
                      minimumFractionDigits: 0,
                      maximumFractionDigits:
                        MULTICHAIN_NETWORK_DECIMAL_PLACES[
                          chainId as CaipChainId
                        ] || 5,
                    },
                  )
                : TOKEN_BALANCE_LOADING,
            },
      [
        isEvmNetworkSelected,
        asset,
        exchangeRates,
        tokenBalances,
        conversionRate,
        currentCurrency,
        chainId,
      ],
    );

    // render balances according to primary currency
    let mainBalance;
    let secondaryBalance;
    const shouldNotShowBalanceOnTestnets =
      isTestNet(chainId) && !showFiatOnTestnets;

    // Set main and secondary balances based on the primary currency and asset type.
    if (primaryCurrency === 'ETH') {
      // TECH_DEBT: this should not be primary currency for multichain, not ETH
      // Default to displaying the formatted balance value and its fiat equivalent.
      mainBalance = balanceValueFormatted?.toUpperCase();
      secondaryBalance = balanceFiat?.toUpperCase();
      // For ETH as a native currency, adjust display based on network safety.
      if (asset?.isETH) {
        // Main balance always shows the formatted balance value for ETH.
        mainBalance = balanceValueFormatted?.toUpperCase();
        // Display fiat value as secondary balance only for original native tokens on safe networks.
        secondaryBalance = shouldNotShowBalanceOnTestnets
          ? undefined
          : balanceFiat?.toUpperCase();
      }
    } else {
      secondaryBalance = balanceValueFormatted?.toUpperCase();
      if (shouldNotShowBalanceOnTestnets && !balanceFiat) {
        mainBalance = undefined;
      } else {
        mainBalance =
          balanceFiat ?? strings('wallet.unable_to_find_conversion_rate');
      }
    }

    if (evmAsset?.hasBalanceError) {
      mainBalance = evmAsset.symbol;
      secondaryBalance = strings('wallet.unable_to_load');
    }

    if (balanceFiat === TOKEN_RATE_UNDEFINED) {
      mainBalance = balanceValueFormatted;
      secondaryBalance = strings('wallet.unable_to_find_conversion_rate');
    }

    asset = asset && { ...asset, balanceFiat, isStaked: asset?.isStaked };

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

      // if the asset is staked, navigate to the native asset details
      if (asset?.isStaked) {
        return navigation.navigate('Asset', {
          ...token.nativeAsset,
        });
      }
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
      const isCurrentAssetEth = evmAsset?.isETH && !evmAsset?.isStaked;
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
      evmAsset?.isETH,
      evmAsset?.isStaked,
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
        onLongPress={asset.isETH || asset.isNative ? null : showRemoveMenu}
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

TokenListItem.displayName = 'TokenListItem';
