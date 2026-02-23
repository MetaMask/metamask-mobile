import React, { createRef } from 'react';
import { screen, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import DeFiSection from './DeFiSection';
import { SectionRefreshHandle } from '../../types';

jest.mock(
  '../../../../../selectors/featureFlagController/assetsDefiPositions',
  () => ({
    selectAssetsDefiPositionsEnabled: jest.fn(() => true),
  }),
);

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(() => false),
}));

const mockUseDeFiPositionsForHomepage = jest.fn();

jest.mock('./hooks', () => ({
  useDeFiPositionsForHomepage: (...args: unknown[]) =>
    mockUseDeFiPositionsForHomepage(...args),
  DeFiPositionEntry: {},
}));

// Mock DeFiPositionsListItem to avoid deep import chain issues
jest.mock('../../../../UI/DeFiPositions/DeFiPositionsListItem', () => {
  const { Text } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockComponent = ({
    protocolAggregate,
  }: {
    protocolAggregate: { protocolDetails: { name: string } };
  }) =>
    ReactActual.createElement(
      Text,
      null,
      protocolAggregate.protocolDetails.name,
    );
  MockComponent.displayName = 'DeFiPositionsListItem';
  return MockComponent;
});

const createMockPosition = (name: string) => ({
  chainId: '0x1',
  protocolId: name.toLowerCase(),
  protocolAggregate: {
    protocolDetails: {
      name,
      iconUrl: `https://example.com/${name}.png`,
    },
    aggregatedMarketValue: 1000,
    positionTypes: {},
  },
});

describe('DeFiSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return values to defaults
    jest
      .requireMock(
        '../../../../../selectors/featureFlagController/assetsDefiPositions',
      )
      .selectAssetsDefiPositionsEnabled.mockReturnValue(true);

    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      hasError: false,
      isEmpty: true,
    });
  });

  it('renders section title when enabled with positions', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [createMockPosition('Aave')],
      isLoading: false,
      hasError: false,
      isEmpty: false,
    });

    renderWithProvider(<DeFiSection />);

    expect(screen.getByText('DeFi')).toBeOnTheScreen();
  });

  it('returns null when DeFi is disabled', () => {
    jest
      .requireMock(
        '../../../../../selectors/featureFlagController/assetsDefiPositions',
      )
      .selectAssetsDefiPositionsEnabled.mockReturnValue(false);

    const { toJSON } = renderWithProvider(<DeFiSection />);

    expect(toJSON()).toBeNull();
  });

  it('returns null when positions are empty and not loading', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      hasError: false,
      isEmpty: true,
    });

    const { toJSON } = renderWithProvider(<DeFiSection />);

    expect(toJSON()).toBeNull();
  });

  it('returns null when there is an error and not loading', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      hasError: true,
      isEmpty: false,
    });

    const { toJSON } = renderWithProvider(<DeFiSection />);

    expect(toJSON()).toBeNull();
  });

  it('renders skeleton when loading', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: true,
      hasError: false,
      isEmpty: false,
    });

    renderWithProvider(<DeFiSection />);

    expect(screen.getByText('DeFi')).toBeOnTheScreen();
    // Skeleton renders 3 placeholder items
  });

  it('renders DeFi positions list items', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [createMockPosition('Aave'), createMockPosition('Uniswap')],
      isLoading: false,
      hasError: false,
      isEmpty: false,
    });

    renderWithProvider(<DeFiSection />);

    expect(screen.getByText('Aave')).toBeOnTheScreen();
    expect(screen.getByText('Uniswap')).toBeOnTheScreen();
  });

  it('title is not interactive (no drill-down for DeFi)', () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [createMockPosition('Aave')],
      isLoading: false,
      hasError: false,
      isEmpty: false,
    });

    renderWithProvider(<DeFiSection />);

    // DeFi section title exists but is not interactive - no onPress passed to SectionTitle
    expect(screen.getByText('DeFi')).toBeOnTheScreen();
    // Verify no arrow icon is rendered (arrow only shows when onPress is provided)
    expect(screen.queryByTestId('icon-arrow-right')).toBeNull();
  });

  it('exposes refresh function via ref', async () => {
    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [createMockPosition('Aave')],
      isLoading: false,
      hasError: false,
      isEmpty: false,
    });

    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(<DeFiSection ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe('function');

    await act(async () => {
      await ref.current?.refresh();
    });

    // Refresh is a no-op for DeFi (data comes from controller)
  });
});
