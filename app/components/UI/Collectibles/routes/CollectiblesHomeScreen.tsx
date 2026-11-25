import React from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { HomeView } from '../views/HomeView';
import {
  collectiblesRoutes,
  type CollectiblesStackParamList,
} from '../routeNames';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function CollectiblesHomeScreen() {
  const navigation = useNavigation();
  const { params } =
    useRoute<
      RouteProp<CollectiblesStackParamList, typeof collectiblesRoutes.home>
    >();

  return (
    <View className="flex-1 bg-default" testID={collectiblesTestIds.landing}>
      <HeaderStandard
        title={strings('collectibles.title')}
        backButtonProps={{ testID: collectiblesTestIds.homeBackButton }}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <HomeView initialTab={params?.tab} />
    </View>
  );
}
