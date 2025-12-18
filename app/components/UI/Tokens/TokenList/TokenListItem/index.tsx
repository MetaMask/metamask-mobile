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

import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import TextComponent, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
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
  selectIsMusdConversionFlowEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';

import { selectIsStakeableToken } from '../../../Stake/selectors/stakeableTokens';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';

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

    const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
    const selectedInternalAccountAddress = useSelector(
      selectSelectedInternalAccountAddress,
    );

    const selectEvmAsset = useMemo(
      () => makeSelectAssetByAddressAndChainId(),
      [],
    );

    const evmAsset = useSelector((state: RootState) =>
      selectEvmAsset(state, {
        address: assetKey.address,
        chainId: assetKey.chainId ?? '',
        isStaked: assetKey.isStaked,
      }),
    );

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const selectedAccount = useSelector(selectSelectedInternalAccount);
    const selectNonEvmAsset = useMemo(() => makeSelectNonEvmAssetById(), []);

    const nonEvmAsset = useSelector((state: RootState) =>
      selectNonEvmAsset(state, {
        accountId: selectedAccount?.id,
        assetId: assetKey.address as CaipAssetId,
      }),
    );
    ///: END:ONLY_INCLUDE_IF

    let asset = isEvmNetworkSelected ? evmAsset : nonEvmAsset;

    const chainId = asset?.chainId as Hex;

    const currentCurrency = useSelector(selectCurrentCurrency);
    const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

    const { getEarnToken } = useEarnTokens();

    // Earn feature flags
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

    // Reorganized layout: Fiat -> Percentage -> Token Amount
    // Main balance shows fiat value
    if (shouldNotShowBalanceOnTestnets && !balanceFiat) {
      mainBalance = undefined;
    } else {
      mainBalance =
        balanceFiat ?? strings('wallet.unable_to_find_conversion_rate');
    }

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

    secondaryBalance = percentageText;
    let secondaryBalanceColorToUse: TextColor | undefined = percentageColor;

    if (evmAsset?.hasBalanceError) {
      mainBalance = evmAsset.symbol;
      secondaryBalance = strings('wallet.unable_to_load');
      secondaryBalanceColorToUse = undefined; // Don't apply percentage color to error messages
    }

    if (balanceFiat === TOKEN_RATE_UNDEFINED) {
      mainBalance = balanceValueFormatted;
      secondaryBalance = strings('wallet.unable_to_find_conversion_rate');
      secondaryBalanceColorToUse = undefined; // Don't apply percentage color to error messages
    }

    asset = asset && { ...asset, balanceFiat, isStaked: asset?.isStaked };

    const earnToken = getEarnToken(asset as TokenI);

    const isMusdConversionFlowEnabled = useSelector(
      selectIsMusdConversionFlowEnabledFlag,
    );

    const { isConversionToken } = useMusdConversionTokens();
    const isConvertibleStablecoin =
      isMusdConversionFlowEnabled && isConversionToken(asset);

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
            source: isFullView ? 'mobile-token-list-page' : 'mobile-token-list',
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

    const isStakeable = useSelector((state: RootState) =>
      selectIsStakeableToken(state, asset as TokenI),
    );

    const renderEarnCta = useCallback(() => {
      if (!asset) {
        return null;
      }

      const shouldShowStakeCta = isStakeable && !asset?.isStaked;

      const shouldShowStablecoinLendingCta =
        earnToken && isStablecoinLendingEnabled;
      const shouldShowMusdConvertCta = isConvertibleStablecoin;

      if (
        shouldShowStakeCta ||
        shouldShowStablecoinLendingCta ||
        shouldShowMusdConvertCta
      ) {
        // TODO: Rename to EarnCta
        return <StakeButton asset={asset} />;
      }
    }, [
      asset,
      earnToken,
      isConvertibleStablecoin,
      isStablecoinLendingEnabled,
      isStakeable,
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
        secondaryBalanceColor={secondaryBalanceColorToUse}
        privacyMode={privacyMode}
        hideSecondaryBalanceInPrivacyMode={false}
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
            <TextComponent variant={TextVariant.BodyMDMedium} numberOfLines={1}>
              {asset.name || asset.symbol}
            </TextComponent>
            {/** Add button link to Portfolio Stake if token is supported ETH chain and not a staked asset */}
          </View>
          <View style={styles.percentageChange}>
            {balanceValueFormatted ? (
              <SensitiveText
                variant={TextVariant.BodySMMedium}
                style={styles.balanceFiat}
                isHidden={privacyMode}
                length={SensitiveTextLength.Short}
              >
                {balanceValueFormatted?.toUpperCase()}
              </SensitiveText>
            ) : null}
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

export { TokenListItemBip44 } from './TokenListItemBip44';
