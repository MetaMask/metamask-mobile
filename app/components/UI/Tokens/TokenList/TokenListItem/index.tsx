import React from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';
import { zeroAddress } from '@ethereumjs/util';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import useTokenBalancesController from '../../../../hooks/useTokenBalancesController/useTokenBalancesController';
import useIsOriginalNativeTokenSymbol from '../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { useTheme } from '../../../../../util/theme';
import { TOKEN_RATE_UNDEFINED } from '../../constants';
import { deriveBalanceFromAssetMarketDetails } from '../../util/deriveBalanceFromAssetMarketDetails';
import {
  selectChainId,
  selectProviderConfig,
  selectTicker,
} from '../../../../../selectors/networkController';
import { selectContractExchangeRates } from '../../../../../selectors/tokenRatesController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { RootState } from '../../../../../reducers';
import { safeToChecksumAddress } from '../../../../../util/address';
import {
  getTestNetImageByChainId,
  isLineaMainnetByChainId,
  isMainnetByChainId,
  isTestNet,
} from '../../../../../util/networks';
import createStyles from '../../styles';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
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
import NetworkMainAssetLogo from '../../../NetworkMainAssetLogo';
import images from 'images/image-icons';
import { TokenI } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { ScamWarningIcon } from '../ScamWarningIcon';
import { ScamWarningModal } from '../ScamWarningModal';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { CustomNetworkImgMapping } from '../../../../../util/networks/customNetworks';
import useStakingChain from '../../../Stake/hooks/useStakingChain';

interface TokenListItemProps {
  asset: TokenI;
  showScamWarningModal: boolean;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (arg: boolean) => void;
}

export const TokenListItem = ({
  asset,
  showScamWarningModal,
  showRemoveMenu,
  setShowScamWarningModal,
}: TokenListItemProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { data: tokenBalances } = useTokenBalancesController();

  const { type } = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const networkName = useSelector(selectNetworkName);
  const primaryCurrency = useSelector(
    (state: RootState) => state.settings.primaryCurrency,
  );

  const styles = createStyles(colors);

  const itemAddress = safeToChecksumAddress(asset.address);

  const { balanceFiat, balanceValueFormatted } =
    deriveBalanceFromAssetMarketDetails(
      asset,
      tokenExchangeRates,
      tokenBalances,
      conversionRate,
      currentCurrency,
    );

  const pricePercentChange1d = itemAddress
    ? tokenExchangeRates?.[itemAddress as `0x${string}`]?.pricePercentChange1d
    : tokenExchangeRates?.[zeroAddress() as Hex]?.pricePercentChange1d;

  // render balances according to primary currency
  let mainBalance;
  let secondaryBalance;

  // Set main and secondary balances based on the primary currency and asset type.
  if (primaryCurrency === 'ETH') {
    // Default to displaying the formatted balance value and its fiat equivalent.
    mainBalance = balanceValueFormatted;
    secondaryBalance = balanceFiat;

    // For ETH as a native currency, adjust display based on network safety.
    if (asset.isETH) {
      // Main balance always shows the formatted balance value for ETH.
      mainBalance = balanceValueFormatted;
      // Display fiat value as secondary balance only for original native tokens on safe networks.
      secondaryBalance = isOriginalNativeTokenSymbol ? balanceFiat : null;
    }
  } else {
    // For non-ETH currencies, determine balances based on the presence of fiat value.
    mainBalance = !balanceFiat ? balanceValueFormatted : balanceFiat;
    secondaryBalance = !balanceFiat ? balanceFiat : balanceValueFormatted;

    // Adjust balances for native currencies in non-ETH scenarios.
    if (asset.isETH) {
      // Main balance logic: Show crypto value if fiat is absent or fiat value on safe networks.
      if (!balanceFiat) {
        mainBalance = balanceValueFormatted; // Show crypto value if fiat is not preferred
      } else if (isOriginalNativeTokenSymbol) {
        mainBalance = balanceFiat; // Show fiat value if it's a safe network
      } else {
        mainBalance = ''; // Otherwise, set to an empty string
      }
      // Secondary balance mirrors the main balance logic for consistency.
      secondaryBalance = !balanceFiat ? balanceFiat : balanceValueFormatted;
    }
  }

  if (asset?.hasBalanceError) {
    mainBalance = asset.symbol;
    secondaryBalance = strings('wallet.unable_to_load');
  }

  if (balanceFiat === TOKEN_RATE_UNDEFINED) {
    mainBalance = balanceValueFormatted;
    secondaryBalance = strings('wallet.unable_to_find_conversion_rate');
  }

  asset = { ...asset, balanceFiat };

  const isMainnet = isMainnetByChainId(chainId);
  const isLineaMainnet = isLineaMainnetByChainId(chainId);

  const { isStakingSupportedChain } = useStakingChain();

  const NetworkBadgeSource = () => {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainnet) return images.ETHEREUM;

    if (isLineaMainnet) return images['LINEA-MAINNET'];

    if (CustomNetworkImgMapping[chainId]) {
      return CustomNetworkImgMapping[chainId];
    }

    return ticker ? images[ticker] : undefined;
  };

  const onItemPress = (token: TokenI) => {
    navigation.navigate('Asset', {
      ...token,
    });
  };

  return (
    <AssetElement
      key={itemAddress || '0x'}
      onPress={onItemPress}
      onLongPress={asset.isETH ? null : showRemoveMenu}
      asset={asset}
      balance={secondaryBalance}
      mainBalance={mainBalance}
    >
      <BadgeWrapper
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={NetworkBadgeSource()}
            name={networkName}
          />
        }
      >
        {asset.isETH ? (
          <NetworkMainAssetLogo style={styles.ethLogo} />
        ) : (
          <AvatarToken
            name={asset.symbol}
            imageSource={{ uri: asset.image }}
            size={AvatarSize.Md}
          />
        )}
      </BadgeWrapper>

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
          {/** Add button link to Portfolio Stake if token is mainnet ETH */}
          {asset.isETH && isStakingSupportedChain && (
            <StakeButton asset={asset} />
          )}
        </View>
        {!isTestNet(chainId) ? (
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
};
