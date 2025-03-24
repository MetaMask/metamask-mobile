import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { TokenI } from '../Tokens/types';
import { Hex } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { selectDestToken, setDestToken } from '../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../util/networks';
import { TokenSelectorItem } from './TokenSelectorItem';
import { TokenIWithFiatAmount } from './useTokensWithBalance';
import { BridgeDestNetworksBar } from './BridgeDestNetworksBar';
import { useDestinationTokens } from './useDestinationTokens';
import { BridgeTokenSelectorBase } from './BridgeTokenSelectorBase';

export const BridgeDestTokenSelector: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const tokensList = useDestinationTokens();
  const selectedDestToken = useSelector(selectDestToken);
  const handleTokenPress = useCallback(
    (token: TokenI) => {
      dispatch(setDestToken(token));
      navigation.goBack();
    },
    [dispatch, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: TokenIWithFiatAmount }) => (
      <TokenSelectorItem
        token={item}
        onPress={handleTokenPress}
        networkName={networkConfigurations[item.chainId as Hex].name}
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        networkImageSource={getNetworkImageSource({ chainId: item.chainId as Hex })}
        shouldShowBalance={false}
        isSelected={
          selectedDestToken?.address === item.address &&
          selectedDestToken?.chainId === item.chainId
        }
      />
    ),
    [handleTokenPress, networkConfigurations, selectedDestToken]
  );

  return (
    <BridgeTokenSelectorBase
      networksBar={<BridgeDestNetworksBar />}
      renderTokenItem={renderItem}
      tokensList={tokensList}
    />
  );
};
