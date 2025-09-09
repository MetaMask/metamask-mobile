import React, { useEffect } from 'react';
import { Hex } from '@metamask/utils';
import { ActivityIndicator, Text, View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { selectTokenDisplayData } from '../../../selectors/tokenSearchDiscoveryDataController';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './styles';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation/types';

type AssetLoaderProps = StackScreenProps<RootParamList, 'AssetLoader'>;

export const AssetLoader: React.FC<AssetLoaderProps> = ({
  route,
}: AssetLoaderProps) => {
  const { address, chainId } = route.params;
  const tokenResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, chainId, address),
  );
  const navigation = useNavigation();

  const { styles } = useStyles(styleSheet, {});

  useEffect(() => {
    Engine.context.TokenSearchDiscoveryDataController.fetchTokenDisplayData(
      chainId,
      address,
    );
    if (tokenResult?.found) {
      navigation.dispatch(
        StackActions.replace(Routes.BROWSER.ASSET_VIEW, {
          ...tokenResult.token,
          chainId,
          isFromSearch: true,
        }),
      );
    }
  }, [tokenResult, address, chainId, navigation]);

  if (tokenResult && !tokenResult.found) {
    return (
      <View style={styles.container}>
        <Text>Token not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator testID="asset-loader-spinner" size="large" />
    </View>
  );
};
