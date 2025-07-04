import AssetElement from '../../../AssetElement';
import React, { useCallback, useMemo } from 'react';
import { TokenI } from '../../../Tokens/types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './styles';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { CaipAssetId, Hex, isCaipChainId } from '@metamask/utils';
import {
  getDefaultNetworkByChainId,
  getTestNetImageByChainId,
  isTestNet,
} from '../../../../../util/networks';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  makeSelectAssetByAddressAndChainId,
  makeSelectNonEvmAssetById,
} from '../../../../../selectors/multichain';
import { FlashListAssetKey } from '../../../Tokens/TokenList';
import {
  selectCurrencyRateForChainId,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { selectIsEvmNetworkSelected } from '../../../../../selectors/multichainNetworkController';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountAddress,
} from '../../../../../selectors/accountsController';
import { selectSingleTokenPriceMarketData } from '../../../../../selectors/tokenRatesController';
import { selectSingleTokenBalance } from '../../../../../selectors/tokenBalancesController';
import { deriveBalanceFromAssetMarketDetails } from '../../../Tokens/util';
import { formatWithThreshold } from '../../../../../util/assets';
import I18n, { strings } from '../../../../../../locales/i18n';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_RATE_UNDEFINED,
} from '../../../Tokens/constants';
import {
  CustomNetworkImgMapping,
  getNonEvmNetworkImageSourceByChainId,
  PopularList,
  UnpopularNetworkList,
} from '../../../../../util/networks/customNetworks';
import { CustomNetworkNativeImgMapping } from '../../../Tokens/TokenList/TokenListItem/CustomNetworkNativeImgMapping';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { View } from 'react-native';
import Tag from '../../../../../component-library/components/Tags/Tag';

interface CardAssetItemProps {
  assetKey: FlashListAssetKey;
  privacyMode: boolean;
  disabled?: boolean;
  onPress?: (asset: TokenI) => void;
}

const CardAssetItem: React.FC<CardAssetItemProps> = ({
  assetKey,
  onPress,
  disabled = false,
  privacyMode,
}) => {
  const { styles } = useStyles(styleSheet, {});

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

  if (!asset || !chainId) {
    return null;
  }

  return (
    <AssetElement
      onPress={onPress}
      disabled={disabled}
      asset={asset}
      balance={mainBalance}
      secondaryBalance={secondaryBalance}
      privacyMode={privacyMode}
    >
      <BadgeWrapper
        style={styles.badge}
        badgePosition={BadgePosition.TopRight}
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
          <Text variant={TextVariant.BodyMD} numberOfLines={1}>
            {asset.name || asset.symbol}
          </Text>
          {/** Add button link to Portfolio Stake if token is supported ETH chain and not a staked asset */}
        </View>

        <View style={styles.percentageChange}>
          {assetKey.tag && (
            <Tag label={assetKey.tag.label} style={assetKey.tag.style} />
          )}
        </View>
      </View>
    </AssetElement>
  );
};

export default CardAssetItem;
