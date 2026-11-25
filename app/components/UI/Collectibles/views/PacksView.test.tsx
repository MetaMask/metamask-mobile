import React from 'react';
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
    ).toHaveTextContent('All prices · Lowest price');
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

  it('shows only the tapped category, and every pack again on "All"', () => {
    renderWithProvider(<PacksView />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('pokemon')),
    );
    expect(shownPackCodes()).toEqual(['pack-8', 'pack-1', 'pack-3']);

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
    expect(shownPackCodes()).toEqual(['pack-5']);

    mockCatalog = {
      ...buildPacksCatalog(
        mockCatalogPacks.map((pack) =>
          pack.code === 'pack-5' ? { ...pack, isMachineOpen: false } : pack,
        ),
        mockPackCategoryMapping,
      ),
      isPending: false,
    };
    rerender(<PacksView />);

    expect(
      screen.queryByTestId(collectiblesTestIds.packsCategoryChip('watches')),
    ).toBeNull();
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

  it('shows the placeholder when no pack is available', () => {
    mockCatalog = { packs: [], categories: [], isPending: false };
    renderWithProvider(<PacksView />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsEmpty),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.packs.empty')),
    ).toBeOnTheScreen();
  });

  it('opens a placeholder from the filter button', () => {
    renderWithProvider(<PacksView />);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.packsFilterButton));

    expect(
      screen.getByTestId(collectiblesTestIds.packsComingSoonSheet),
    ).toBeOnTheScreen();
  });

  it('opens a placeholder from a pack price button', () => {
    renderWithProvider(<PacksView />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsTileBuy('pack-1')),
    );

    const sheet = screen.getByTestId(collectiblesTestIds.packsComingSoonSheet);
    expect(within(sheet).getByText('Lorem ipsum')).toBeOnTheScreen();
  });
});
