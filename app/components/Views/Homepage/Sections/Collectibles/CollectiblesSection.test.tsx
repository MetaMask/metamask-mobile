import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { mockHomePacks } from '../../../../UI/Collectibles/mocks/homePacks';
import { collectiblesTestIds } from '../../../../UI/Collectibles/Collectibles.testIds';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesSection } from './CollectiblesSection';

let mockQuery: {
  data?: unknown;
  isPending: boolean;
  isError: boolean;
  refetch: jest.Mock;
};

jest.mock('../../../../UI/Collectibles/hooks/useHomePacks', () => ({
  useHomePacks: () => mockQuery,
}));
jest.mock('../../hooks/useHomeViewedEvent', () => ({
  ...jest.requireActual('../../hooks/useHomeViewedEvent'),
  __esModule: true,
  default: () => ({ onLayout: jest.fn() }),
}));
jest.mock('../../hooks/useSectionPerformance', () => ({
  useSectionPerformance: jest.fn(),
}));

function renderSection() {
  return renderWithProvider(
    <CollectiblesSection sectionIndex={0} totalSectionsLoaded={1} />,
  );
}

describe('CollectiblesSection', () => {
  beforeEach(() => {
    mockQuery = {
      data: mockHomePacks,
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    };
  });

  it('shows skeletons while loading', () => {
    mockQuery = { ...mockQuery, data: undefined, isPending: true };
    renderSection();
    expect(screen.getByTestId(collectiblesTestIds.skeleton)).toBeOnTheScreen();
  });

  it.each([
    ['there are no packs', { data: [] }],
    ['the query fails', { data: undefined, isError: true }],
  ])('shows the empty placeholder when %s', (_, state) => {
    mockQuery = { ...mockQuery, ...state };
    renderSection();
    expect(screen.getByTestId(collectiblesTestIds.empty)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.home.empty')),
    ).toBeOnTheScreen();
  });

  it('keeps cached packs when a refetch fails', () => {
    mockQuery = { ...mockQuery, isError: true };
    renderSection();
    expect(
      screen.getByTestId(collectiblesTestIds.tile(mockHomePacks[0].code)),
    ).toBeOnTheScreen();
  });

  it('renders the mock packs', () => {
    renderSection();
    const [firstPack] = mockHomePacks;
    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
    expect(
      screen.getByTestId(collectiblesTestIds.tile(firstPack.code)),
    ).toBeOnTheScreen();
    expect(screen.getByText(firstPack.name)).toBeOnTheScreen();
    expect(screen.getByText(firstPack.subtitle)).toBeOnTheScreen();
    expect(screen.getByText(String(firstPack.priceLabel))).toBeOnTheScreen();
  });
});
