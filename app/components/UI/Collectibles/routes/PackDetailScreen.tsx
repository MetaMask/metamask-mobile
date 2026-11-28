import React from 'react';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { View } from '../../primitives/View';
import { PackDetailView } from '../views/PackDetailView';
import {
  collectiblesRoutes,
  type CollectiblesParamList,
  type CollectiblesStackParamList,
} from '../routeNames';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function PackDetailScreen() {
  const navigation = useNavigation<NavigationProp<CollectiblesParamList>>();
  const { packCode } =
    useRoute<
      RouteProp<
        CollectiblesStackParamList,
        typeof collectiblesRoutes.packDetail
      >
    >().params;

  return (
    <View className="flex-1 bg-default" testID={collectiblesTestIds.packDetail}>
      <HeaderStandard
        backButtonProps={{ testID: collectiblesTestIds.packDetailBack }}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <PackDetailView
        packCode={packCode}
        onOpenPack={(params) =>
          navigation.navigate(collectiblesRoutes.buySheet, params)
        }
      />
    </View>
  );
}
