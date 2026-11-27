import React from 'react';
import { Button } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import {
  collectiblesRoutes,
  type CollectiblesParamList,
} from '#app/components/UI/Collectibles/routeNames';
import { CollectiblesLayout } from './CollectiblesLayout';

jest.mock('#app/components/UI/Collectibles/hooks/usePacksCatalog', () => ({
  usePacksCatalog: () => ({ packs: [], categories: [], isPending: true }),
}));

jest.mock('#app/components/UI/Collectibles/hooks/useEpicHuntPacks', () => ({
  useEpicHuntPacks: () => ({ data: [], isPending: true }),
}));

jest.mock('#app/components/UI/Collectibles/hooks/useCollectionCards', () => ({
  useCollectionCards: () => ({ data: [], isPending: false, isError: false }),
}));

interface MockPagerProps {
  children?: React.ReactNode;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
}

let mockPagerProps: MockPagerProps | undefined;

jest.mock('react-native-pager-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockPagerView = ReactActual.forwardRef(
    (props: MockPagerProps, _ref: React.Ref<unknown>) => {
      mockPagerProps = props;
      return <View>{props.children}</View>;
    },
  );
  return { __esModule: true, default: MockPagerView };
});

const Stack = createNativeStackNavigator();

const tabs = [
  [strings('collectibles.tabs.popular'), collectiblesTestIds.popularView],
  [strings('collectibles.tabs.packs'), collectiblesTestIds.packsSkeleton],
  [strings('collectibles.tabs.collection'), collectiblesTestIds.collectionView],
  [
    strings('collectibles.tabs.marketplace'),
    collectiblesTestIds.marketplaceView,
  ],
];

function EntryScreen() {
  const navigation = useNavigation<NavigationProp<CollectiblesParamList>>();

  return (
    <>
      <Button
        title="open"
        onPress={() => navigation.navigate(collectiblesRoutes.root)}
      />
      <Button
        title="open collection"
        onPress={() =>
          navigation.navigate(collectiblesRoutes.root, {
            screen: collectiblesRoutes.home,
            params: { tab: 'collection' },
          })
        }
      />
    </>
  );
}

function openFromEntry(button = 'open') {
  renderWithProvider(
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Entry" component={EntryScreen} />
      <Stack.Screen
        name={collectiblesRoutes.root}
        component={CollectiblesLayout}
      />
    </Stack.Navigator>,
  );
  fireEvent.press(screen.getByText(button));
}

function tabTestId(index: number) {
  return `${collectiblesTestIds.tabBar}-tab-${index}`;
}

describe('CollectiblesLayout', () => {
  it('shows the header and the four tabs, and opens on Popular', async () => {
    openFromEntry();

    expect(
      await screen.findByText(strings('collectibles.title')),
    ).toBeOnTheScreen();
    tabs.forEach(([label], index) => {
      expect(screen.getByTestId(tabTestId(index))).toBeOnTheScreen();
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(
      screen.getByTestId(collectiblesTestIds.popularView),
    ).toBeOnTheScreen();
  });

  it.each([1, 2, 3])('shows tab %i when tapped', async (index) => {
    openFromEntry();

    fireEvent.press(await screen.findByTestId(tabTestId(index)));

    expect(await screen.findByTestId(tabs[index][1])).toBeOnTheScreen();
    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
  });

  it('changes tab on swipe', async () => {
    openFromEntry();
    await screen.findByTestId(collectiblesTestIds.popularView);

    act(() =>
      mockPagerProps?.onPageSelected?.({ nativeEvent: { position: 3 } }),
    );

    expect(
      await screen.findByTestId(collectiblesTestIds.marketplaceView),
    ).toBeOnTheScreen();
  });

  it('opens the tab the entry point asks for', async () => {
    openFromEntry('open collection');

    expect(
      await screen.findByTestId(collectiblesTestIds.collectionView),
    ).toBeOnTheScreen();
  });

  it('leaves the experience on back, whatever tabs were visited', async () => {
    openFromEntry();
    fireEvent.press(await screen.findByTestId(tabTestId(1)));
    fireEvent.press(screen.getByTestId(tabTestId(3)));

    fireEvent.press(screen.getByTestId(collectiblesTestIds.homeBackButton));

    expect(await screen.findByText('open')).toBeOnTheScreen();
    expect(screen.queryByTestId(collectiblesTestIds.tabBar)).toBeNull();
  });
});
