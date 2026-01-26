import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectTokenDetailsV2Enabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import Asset from '../../../Views/Asset';
import { TokenI } from '../../Tokens/types';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../hooks/useStyles';
import { RootState } from '../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { isMainnetByChainId } from '../../../../util/networks';
import useBlockExplorer from '../../../hooks/useBlockExplorer';
import { AssetInlineHeader } from '../components/AssetInlineHeader';

interface TokenDetailsProps {
  route: {
    params: TokenI;
  };
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
  });
};

const TokenDetails: React.FC<{ token: TokenI }> = ({ token }) => {
  const { styles } = useStyles(styleSheet, {});
  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, token.chainId),
  );
  const navigation = useNavigation();

  const isNativeToken = token.isNative ?? token.isETH;
  const isMainnet = isMainnetByChainId(token.chainId);
  const { getBlockExplorerUrl } = useBlockExplorer(token.chainId);

  const shouldShowMoreOptionsInNavBar =
    isMainnet ||
    !isNativeToken ||
    (isNativeToken && getBlockExplorerUrl(token.address, token.chainId));

  const openAssetOptions = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'AssetOptions',
      params: {
        isNativeCurrency: isNativeToken,
        address: token.address,
        chainId: token.chainId,
        asset: token,
      },
    });
  };

  return (
    <View style={styles.wrapper}>
      <AssetInlineHeader
        title={token.symbol}
        networkName={networkConfigurationByChainId.name}
        onBackPress={() => navigation.goBack()}
        onOptionsPress={
          shouldShowMoreOptionsInNavBar ? openAssetOptions : () => undefined
        }
      />
    </View>
  );
};

const TokenDetailsFeatureFlagWrapper: React.FC<TokenDetailsProps> = (props) => {
  const isTokenDetailsV2Enabled = useSelector(selectTokenDetailsV2Enabled);
  // const isTokenDetailsV2Enabled = true;

  return isTokenDetailsV2Enabled ? (
    <TokenDetails token={props.route.params} />
  ) : (
    <Asset {...props} />
  );
};

export { TokenDetailsFeatureFlagWrapper as TokenDetails };

// {
//   key: 'Asset-kPogXX-PuEGiLDNqIlEyz',
//   name: 'Asset',
//   params: {
//     accountType: 'eip155:eoa',
//     address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
//     aggregators: [],
//     balance: '114.12913',
//     balanceFiat: 'US$114.06',
//     chainId: '0xe708',
//     decimals: 6,
//     image:
//       'https://static.cx.metamask.io/api/v1/tokenIcons/59144/0x176211869ca2b568f2a7d4ee941e073a821ee1ff.png',
//     isETH: false,
//     isNative: false,
//     isStaked: false,
//     logo: 'https://static.cx.metamask.io/api/v1/tokenIcons/59144/0x176211869ca2b568f2a7d4ee941e073a821ee1ff.png',
//     name: 'USDC',
//     scrollToMerklRewards: undefined,
//     symbol: 'USDC',
//     ticker: 'USDC',
//   },
// };
