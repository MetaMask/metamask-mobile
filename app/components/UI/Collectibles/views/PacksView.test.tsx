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
import { PacksView } from './PacksView';

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

describe('PacksView', () => {
  beforeEach(() => {
    mockCatalog = loadedCatalog();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the controls, chips and grid', () => {
    renderWithProvider(<PacksView />);

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
    renderWithProvider(<PacksView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsFilterSortLine),
    ).toHaveTextContent(
      strings('collectibles.packs.filter_sort', {
        filter: strings('collectibles.packs.all_prices'),
        sort: strings('collectibles.packs.lowest_price'),
      }),
    );
  });

  it('selects "All" by default and shows every open priced pack', () => {
    renderWithProvider(<PacksView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    ).toBeSelected();
    expect(shownPackCodes()).toEqual(mockCatalog.packs.map(({ code }) => code));
    expect(shownPackCodes()).not.toContain('pack-11');
    expect(shownPackCodes()).not.toContain('pack-12');
  });

  it('shows only the packs of the tapped category', () => {
    renderWithProvider(<PacksView />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('pokemon')),
    );

    expect(shownPackCodes()).toEqual(['pack-8', 'pack-1', 'pack-3']);
  });

  it('shows every pack again after tapping "All"', () => {
    renderWithProvider(<PacksView />);
    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('pokemon')),
    );

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    );

    expect(shownPackCodes()).toHaveLength(mockCatalog.packs.length);
  });

  it('falls back to "All" when the selected category loses its last pack', () => {
    const { rerender } = renderWithProvider(<PacksView />);
    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('watches')),
    );

    mockCatalog = catalogWithoutWatches();
    rerender(<PacksView />);

    expect(
      screen.queryByTestId(collectiblesTestIds.packsCategoryChip('watches')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    ).toBeSelected();
    expect(shownPackCodes()).toHaveLength(mockCatalog.packs.length);
  });

  it('stays on "All" when a lost category comes back', () => {
    const { rerender } = renderWithProvider(<PacksView />);
    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('watches')),
    );
    mockCatalog = catalogWithoutWatches();
    rerender(<PacksView />);

    mockCatalog = loadedCatalog();
    rerender(<PacksView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    ).toBeSelected();
    expect(shownPackCodes()).toHaveLength(mockCatalog.packs.length);
  });

  it('shows skeletons while loading', () => {
    mockCatalog = { packs: [], categories: [], isPending: true };
    renderWithProvider(<PacksView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsSkeleton),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(collectiblesTestIds.packsGrid)).toBeNull();
  });

  it('shows and announces the placeholder when no pack is available', () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(jest.fn());
    mockCatalog = { packs: [], categories: [], isPending: false };
    renderWithProvider(<PacksView />);

    expect(announce).toHaveBeenCalledWith(strings('collectibles.packs.empty'));

    expect(
      screen.getByTestId(collectiblesTestIds.packsEmpty),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.packs.empty')),
    ).toBeOnTheScreen();
  });
});
