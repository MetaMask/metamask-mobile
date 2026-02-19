import React, { createRef } from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Homepage from './Homepage';
import { SectionRefreshHandle } from './types';

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

// Mock feature flags - enable all sections
jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => true),
}));

jest.mock(
  '../../../selectors/featureFlagController/assetsDefiPositions',
  () => ({
    selectAssetsDefiPositionsEnabled: jest.fn(() => true),
  }),
);

describe('Homepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders container element', () => {
    renderWithProvider(<Homepage />);

    expect(screen.getByTestId('homepage-container')).toBeOnTheScreen();
  });

  it('renders Tokens section title', () => {
    renderWithProvider(<Homepage />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
  });

  it('renders Perpetuals section title', () => {
    renderWithProvider(<Homepage />);

    expect(screen.getByText('Perpetuals')).toBeOnTheScreen();
  });

  it('renders Predictions section title', () => {
    renderWithProvider(<Homepage />);

    expect(screen.getByText('Predictions')).toBeOnTheScreen();
  });

  it('renders DeFi section title', () => {
    renderWithProvider(<Homepage />);

    expect(screen.getByText('DeFi')).toBeOnTheScreen();
  });

  it('renders NFTs section title', () => {
    renderWithProvider(<Homepage />);

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('exposes refresh function via ref', () => {
    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(<Homepage ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe('function');
  });

  it('refresh function returns a resolved promise', async () => {
    const ref = createRef<SectionRefreshHandle>();
    renderWithProvider(<Homepage ref={ref} />);

    const result = ref.current?.refresh();

    await expect(result).resolves.toBeUndefined();
  });
});
