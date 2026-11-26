import React, { useState } from 'react';
import { TabView, type SceneRendererProps } from 'react-native-tab-view';
import { strings } from '../../../../../locales/i18n';
import TabViewBar, {
  TAB_VIEW_INITIAL_LAYOUT,
  type TabViewRoute,
} from '../../../../component-library/components-temp/Tabs/TabViewBar/TabViewBar';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { PopularView } from './PopularView';
import { PackListingsView } from './PackListingsView';
import { CollectionView } from './CollectionView';
import { MarketplaceView } from './MarketplaceView';
import { collectiblesTabs, type CollectiblesTab } from '../routeNames';
import { collectiblesTestIds } from '../Collectibles.testIds';

interface Props {
  initialTab?: CollectiblesTab;
}

const routes: TabViewRoute[] = collectiblesTabs.map((tab) => ({
  key: tab,
  title: strings(`collectibles.tabs.${tab}`),
}));

interface SceneProps {
  jumpTo: (tab: CollectiblesTab) => void;
}

const scenes: Record<
  CollectiblesTab,
  (props: SceneProps) => React.JSX.Element
> = {
  popular: PopularView,
  packs: PackListingsView,
  collection: CollectionView,
  marketplace: MarketplaceView,
};

function renderScene({
  route,
  jumpTo,
}: SceneRendererProps & { route: TabViewRoute }) {
  const Scene = scenes[route.key as CollectiblesTab];

  return (
    <ErrorBoundary view={`Collectibles-${route.key}`}>
      <Scene jumpTo={jumpTo} />
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

export function HomeView({ initialTab }: Props) {
  const tabIndex = collectiblesTabs.indexOf(initialTab ?? 'popular');
  const [index, setIndex] = useState(tabIndex === -1 ? 0 : tabIndex);

  return (
    <TabView
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      initialLayout={TAB_VIEW_INITIAL_LAYOUT}
      lazy
    />
  );
}
