import React, { useCallback } from 'react';
import { View } from 'react-native';
import { zeroAddress } from 'ethereumjs-util';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import {
  selectContractExchangeRates,
  selectTokenMarketData,
} from '../../../../../selectors/tokenRatesController';
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { safeToChecksumAddress } from '../../../../../util/address';
import {
  getTestNetImageByChainId,
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
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { TokenI } from '../../types';
import { ScamWarningIcon } from '../ScamWarningIcon';
import { ScamWarningModal } from '../ScamWarningModal';
import { StakeButton } from '../../../Stake/components/StakeButton';
import { CHAIN_ID_TOKEN_IMAGE_MAP } from '../../../../../util/networks/networks';
import useStakingChain from '../../../Stake/hooks/useStakingChain';
import {
  PopularList,
  UnpopularNetworkList,
} from '../../../../../util/networks/customNetworks';
interface TokenListItemProps {
  asset: TokenI;
  showScamWarningModal: boolean;
  showRemoveMenu: (arg: TokenI) => void;
  setShowScamWarningModal: (arg: boolean) => void;
  privacyMode: boolean;
}

export const TokenListItem = ({
  asset,
  showScamWarningModal,
  showRemoveMenu,
  setShowScamWarningModal,
  privacyMode,
}: TokenListItemProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  // const { data: tokenBalances } = useTokenBalancesController();

  // const { type } = useSelector(selectProviderConfig);
  // const chainId = useSelector(selectChainId);
  // const ticker = useSelector(selectTicker);
  // const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
  //   chainId,
  //   ticker,
  //   type,
  // );
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  // const currentCurrency = useSelector(selectCurrentCurrency);
  // const conversionRate = useSelector(selectConversionRate);
  const networkName = useSelector(selectNetworkName);
  // const primaryCurrency = useSelector(
  //   (state: RootState) => state.settings.primaryCurrency,
  // );
  const multiChainMarketData = useSelector(selectTokenMarketData);
  // console.log('multiChainMarketData', multiChainMarketData);
  const styles = createStyles(colors);

  const itemAddress = safeToChecksumAddress(asset.address);

  // const { balanceFiat, balanceValueFormatted } =
  //   deriveBalanceFromAssetMarketDetails(
  //     asset,
  //     tokenExchangeRates,
  //     tokenBalances,
  //     conversionRate,
  //     currentCurrency,
  //   );

  // const pricePercentChange1d = itemAddress
  //   ? tokenExchangeRates?.[itemAddress as `0x${string}`]?.pricePercentChange1d
  //   : tokenExchangeRates?.[zeroAddress() as Hex]?.pricePercentChange1d;

  // const pricePercentChange1d =
  //   multiChainMarketData?.[asset.chainId as HexString]?.[
  //     asset.address as HexString
  //   ]?.pricePercentChange1d;

  const tokenPercentageChange = asset.address
    ? multiChainMarketData?.[asset.chainId as HexString]?.[
        asset.address as HexString
      ]?.pricePercentChange1d
    : null;

  const pricePercentChange1d = asset.isNative
    ? multiChainMarketData?.[asset.chainId as HexString]?.[zeroAddress()]
        ?.pricePercentChange1d
    : tokenPercentageChange;

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

  const { isStakingSupportedChain } = useStakingChain();

  const getNetworkBadgeSrc = useCallback((currentChainId: HexString) => {
    if (isTestNet(currentChainId))
      return getTestNetImageByChainId(currentChainId);

    const defaultNetwork = getDefaultNetworkByChainId(currentChainId) as any;

    if (defaultNetwork) {
      return defaultNetwork.imageSource;
    }

    const unpopularNetwork = UnpopularNetworkList.find(
      (networkConfig) => networkConfig.chainId === currentChainId,
    );

    const customNetworkImg = CHAIN_ID_TOKEN_IMAGE_MAP[currentChainId];

    const popularNetwork = PopularList.find(
      (networkConfig) => networkConfig.chainId === currentChainId,
    );

    const network = unpopularNetwork || popularNetwork;
    if (network) {
      return network.rpcPrefs.imageSource;
    }
    if (customNetworkImg) {
      return customNetworkImg;
    }
  }, []);

  const onItemPress = (token: TokenI) => {
    // if the asset is staked, navigate to the native asset details
    if (asset.isStaked) {
      return navigation.navigate('Asset', { ...token.nativeAsset });
    }
    navigation.navigate('Asset', {
      ...token,
    });
  };

  return (
    <AssetElement
      // assign staked asset a unique key
      key={asset.isStaked ? '0x_staked' : itemAddress || '0x'}
      onPress={onItemPress}
      onLongPress={asset.isETH ? null : showRemoveMenu}
      asset={asset}
      balance={asset.balanceFiat}
      mainBalance={asset.balance}
      privacyMode={privacyMode}
    >
      <BadgeWrapper
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={getNetworkBadgeSrc(asset.chainId as HexString)}
            name={networkName}
          />
        }
      >
        {asset.isNative ? (
          <NetworkAssetLogo
            chainId={asset.chainId as HexString}
            style={styles.ethLogo}
            ticker={asset.symbol}
            big={false}
            biggest={false}
            testID={'PLACE HOLDER'}
          />
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
          {/** Add button link to Portfolio Stake if token is supported ETH chain and not a staked asset */}
          {asset.isETH && isStakingSupportedChain && !asset.isStaked && (
            <StakeButton asset={asset} />
          )}
        </View>
        {/* TODO: Make sure this works later */}
        {!isTestNet(asset.chainId as HexString) ? (
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
