import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import {
  mockCatalogPacks,
  mockPackCategoryMapping,
} from '#app/components/UI/Collectibles/mocks/packsCatalog';
import { buildPacksCatalog } from '#app/components/UI/Collectibles/utils/packsCatalog';
import { PackListingsView } from '#app/components/UI/Collectibles/views/PackListingsView';
import { collectiblesRoutes } from '#app/components/UI/Collectibles/routeNames';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from '@metamask/design-system-react-native';

let mockCatalog: ReturnType<typeof buildPacksCatalog> & { isPending: boolean };

jest.mock('#app/components/UI/Collectibles/hooks/usePacksCatalog', () => ({
  usePacksCatalog: () => mockCatalog,
}));

function loadedCatalog() {
  return {
    ...buildPacksCatalog(mockCatalogPacks, mockPackCategoryMapping),
    isPending: false,
  };
}

function catalogWithoutWatches() {
  return {
    ...buildPacksCatalog(
      mockCatalogPacks.map((pack) =>
        pack.code === 'pack-5' ? { ...pack, isMachineOpen: false } : pack,
      ),
      mockPackCategoryMapping,
    ),
    isPending: false,
  };
}

function shownPackCodes() {
  const grid = screen.getByTestId(collectiblesTestIds.packsGrid);
  return within(grid)
    .queryAllByTestId(/^collectibles-packs-tile-pack-\d+$/)
    .map((tile) => tile.props.testID.replace('collectibles-packs-tile-', ''));
}

const Stack = createNativeStackNavigator();

function PackDetailStub() {
  const { params } = useRoute();
  return <Text>{`pack detail: ${JSON.stringify(params)}`}</Text>;
}

describe('PackListingsView', () => {
  beforeEach(() => {
    mockCatalog = loadedCatalog();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the packs layout', () => {
    renderWithProvider(<PackListingsView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsFilterButton),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(collectiblesTestIds.packsSortButton),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.packs.all')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(collectiblesTestIds.packsGrid)).toBeOnTheScreen();
  });

  it('reads "All prices · Lowest price" by default', () => {
    renderWithProvider(<PackListingsView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsFilterSortLine),
    ).toHaveTextContent(
      strings('collectibles.packs.filter_sort', {
        filter: strings('collectibles.packs.all_prices'),
        sort: strings('collectibles.packs.lowest_price'),
      }),
    );
  });

  it('selects "All" by default', () => {
    renderWithProvider(<PackListingsView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    ).toBeSelected();
  });

  it('shows every open priced pack by default', () => {
    renderWithProvider(<PackListingsView />);

    expect(shownPackCodes()).toEqual(mockCatalog.packs.map(({ code }) => code));
    expect(shownPackCodes()).not.toContain('pack-11');
    expect(shownPackCodes()).not.toContain('pack-12');
  });

  it('shows only the packs of the tapped category', () => {
    renderWithProvider(<PackListingsView />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('pokemon')),
    );

    expect(shownPackCodes()).toEqual(['pack-8', 'pack-1', 'pack-3']);
  });

  it('shows every pack again after tapping "All"', () => {
    renderWithProvider(<PackListingsView />);
    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('pokemon')),
    );

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    );

    expect(shownPackCodes()).toHaveLength(mockCatalog.packs.length);
  });

  it('falls back to "All" when the selected category loses its last pack', () => {
    const { rerender } = renderWithProvider(<PackListingsView />);
    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('watches')),
    );

    mockCatalog = catalogWithoutWatches();
    rerender(<PackListingsView />);

    expect(
      screen.queryByTestId(collectiblesTestIds.packsCategoryChip('watches')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    ).toBeSelected();
    expect(shownPackCodes()).toHaveLength(mockCatalog.packs.length);
  });

  it('shows skeletons while loading', () => {
    mockCatalog = { packs: [], categories: [], isPending: true };
    renderWithProvider(<PackListingsView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsSkeleton),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(collectiblesTestIds.packsGrid),
    ).not.toBeOnTheScreen();
  });

  it('announces the placeholder when no pack is available', () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(jest.fn());
    mockCatalog = { packs: [], categories: [], isPending: false };
    renderWithProvider(<PackListingsView />);

    expect(announce).toHaveBeenCalledWith(strings('collectibles.packs.empty'));
  });

  it('shows the placeholder when no pack is available', () => {
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(jest.fn());
    mockCatalog = { packs: [], categories: [], isPending: false };
    renderWithProvider(<PackListingsView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsEmpty),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.packs.empty')),
    ).toBeOnTheScreen();
  });

  it('opens the pack detail when a tile is pressed', async () => {
    renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name="Packs" component={PackListingsView} />
        <Stack.Screen
          name={collectiblesRoutes.packDetail}
          component={PackDetailStub}
        />
      </Stack.Navigator>,
    );

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsTileDetail('pack-1')),
    );

    expect(
      await screen.findByText(
        `pack detail: ${JSON.stringify({ packCode: 'pack-1' })}`,
      ),
    ).toBeOnTheScreen();
  });
});
