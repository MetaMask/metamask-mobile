import React, { useState } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { TabView, type SceneRendererProps } from 'react-native-tab-view';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import TabViewBar, {
  TAB_VIEW_INITIAL_LAYOUT,
  type TabViewRoute,
} from '../../../../component-library/components-temp/Tabs/TabViewBar/TabViewBar';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { View } from '../../primitives/View';
import { PopularView } from '../views/PopularView';
import { PacksView } from '../views/PacksView';
import { CollectionView } from '../views/CollectionView';
import { MarketplaceView } from '../views/MarketplaceView';
import {
  collectiblesRoutes,
  collectiblesTabs,
  type CollectiblesParams,
  type CollectiblesTab,
} from '../routeNames';
import { collectiblesTestIds } from '../Collectibles.testIds';

const routes: TabViewRoute[] = collectiblesTabs.map((tab) => ({
  key: tab,
  title: strings(`collectibles.tabs.${tab}`),
}));

const scenes: Record<CollectiblesTab, () => React.JSX.Element> = {
  popular: PopularView,
  packs: PacksView,
  collection: CollectionView,
  marketplace: MarketplaceView,
};

function renderScene({ route }: { route: TabViewRoute }) {
  const Scene = scenes[route.key as CollectiblesTab];

  return (
    <ErrorBoundary view={`Collectibles-${route.key}`}>
      <Scene />
    </ErrorBoundary>
  );
}

function renderTabBar(
  props: SceneRendererProps & {
    navigationState: { index: number; routes: TabViewRoute[] };
  },
) {
  return <TabViewBar {...props} testID={collectiblesTestIds.tabBar} />;
}

export function CollectiblesLayout() {
  const navigation = useNavigation();
  const { params } =
    useRoute<
      RouteProp<
        Record<typeof collectiblesRoutes.root, CollectiblesParams | undefined>
      >
    >();
  const [index, setIndex] = useState(() =>
    Math.max(collectiblesTabs.indexOf(params?.tab ?? 'popular'), 0),
  );

  return (
    <View className="flex-1 bg-default" testID={collectiblesTestIds.landing}>
      <HeaderStandard
        title={strings('collectibles.title')}
        backButtonProps={{ testID: collectiblesTestIds.homeBackButton }}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <TabView
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        initialLayout={TAB_VIEW_INITIAL_LAYOUT}
        lazy
      />
    </View>
  );
}
