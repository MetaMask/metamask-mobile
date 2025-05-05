import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipAssetType,
  CaipAssetId,
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
  Hex,
  isCaipChainId,
} from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { TOKEN_BALANCE_LOADING, TOKEN_RATE_UNDEFINED } from '../../constants';
import { deriveBalanceFromAssetMarketDetails } from '../../util/deriveBalanceFromAssetMarketDetails';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectSelectedInternalAccount,
  ///: END:ONLY_INCLUDE_IF(keyring-snaps)
  selectSelectedInternalAccountAddress,
} from '../../../../../selectors/accountsController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../selectors/currencyRateController';
import { RootState } from '../../../../../reducers';
import {
  getTestNetImageByChainId,
  isTestNet,
  getDefaultNetworkByChainId,
} from '../../../../../util/networks';
import createStyles from '../../styles';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import PercentageChange from '../../../../../component-library/components-temp/Price/PercentageChange';
import AssetElement from '../../../AssetElement';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { TokenI } from '../../types';
import I18n, { strings } from '../../../../../../locales/i18n';
import { ScamWarningIcon } from '../ScamWarningIcon';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { useStakingChainByChainId } from '../../../Stake/hooks/useStakingChain';
import {
  PopularList,
  UnpopularNetworkList,
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
} from '../../../../../util/networks/customNetworks';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { formatWithThreshold } from '../../../../../util/assets';
import { CustomNetworkNativeImgMapping } from './CustomNetworkNativeImgMapping';
import { TraceName, trace } from '../../../../../util/trace';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  makeSelectNonEvmAssetById,
  selectMultichainAssetsRates,
} from '../../../../../selectors/multichain/multichain';
///: END:ONLY_INCLUDE_IF(keyring-snaps)
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { makeSelectAssetByAddressAndChainId } from '../../../../../selectors/multichain';
import { FlashListAssetKey } from '..';
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
    const networkConfigurations = useSelector(selectNetworkConfigurations);
    const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

    // multi chain
    const multiChainTokenBalance = useSelector(selectTokensBalances);
    const multiChainMarketData = useSelector(selectTokenMarketData);
    const multiChainCurrencyRates = useSelector(selectCurrencyRates);

    const earnTokens = useEarnTokens();

    // Earn feature flags
    const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
    const isStablecoinLendingEnabled = useSelector(
      selectStablecoinLendingEnabledFlag,
    );

    const styles = createStyles(colors);
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const allMultichainAssetsRates = useSelector(selectMultichainAssetsRates);
    ///: END:ONLY_INCLUDE_IF(keyring-snaps)

    // Choose values based on multichain or legacy
    const exchangeRates = multiChainMarketData?.[chainId as Hex];
    const tokenBalances =
      multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
        chainId as Hex
      ];

    const nativeCurrency =
      networkConfigurations?.[chainId as Hex]?.nativeCurrency;

    const conversionRate =
      multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0;

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
                    { minimumFractionDigits: 0, maximumFractionDigits: 5 },
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
      ],
    );

    const getPricePercentChange1d = () => {
      const tokenPercentageChange = asset?.address
        ? multiChainMarketData?.[chainId as Hex]?.[asset.address as Hex]
            ?.pricePercentChange1d
        : undefined;
      const evmPricePercentChange1d = asset?.isNative
        ? multiChainMarketData?.[chainId as Hex]?.[
            getNativeTokenAddress(chainId as Hex) as Hex
          ]?.pricePercentChange1d
        : tokenPercentageChange;
      if (isEvmNetworkSelected) {
        return evmPricePercentChange1d;
      }
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      return allMultichainAssetsRates[asset?.address as CaipAssetType]
        ?.marketData?.pricePercentChange?.P1D;
      ///: END:ONLY_INCLUDE_IF(keyring-snaps)
    };

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
              size={AvatarSize.Md}
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
          size={AvatarSize.Md}
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

      const isAssetSupportedStablecoin = earnTokens.find(
        (token) =>
          token.symbol === asset.symbol &&
          asset.chainId === token?.chainId &&
          !asset?.isStaked,
      );
      const shouldShowStablecoinLendingCta =
        isAssetSupportedStablecoin && isStablecoinLendingEnabled;

      if (shouldShowPooledStakingCta || shouldShowStablecoinLendingCta) {
        // TODO: Rename to EarnCta
        return <StakeButton asset={asset} />;
      }
    }, [
      asset,
      earnTokens,
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
            <Text variant={TextVariant.BodyLGMedium} numberOfLines={1}>
              {asset.name || asset.symbol}
            </Text>
            {/** Add button link to Portfolio Stake if token is supported ETH chain and not a staked asset */}
            {renderEarnCta()}
          </View>
          {!isTestNet(chainId) && showPercentageChange ? (
            <PercentageChange value={getPricePercentChange1d()} />
          ) : null}
        </View>
        <ScamWarningIcon
          asset={asset}
          setShowScamWarningModal={setShowScamWarningModal}
        />
      </AssetElement>
    );
  },
);
