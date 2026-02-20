import React, { createRef } from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
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

// State with preferences needed for NFT section rendering
const stateWithPreferences = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        isIpfsGatewayEnabled: true,
        displayNftMedia: true,
      },
    },
  },
};

describe('Homepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders NFTs section title', () => {
    renderWithProvider(<Homepage />, { state: stateWithPreferences });

    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('renders NFTs section empty state when user has no NFTs', () => {
    renderWithProvider(<Homepage />, { state: stateWithPreferences });

    expect(screen.getByText('Import NFTs')).toBeOnTheScreen();
    expect(screen.getByText('Easily add your collectibles')).toBeOnTheScreen();
  });

  it('exposes refresh function via ref', () => {
    const ref = createRef<SectionRefreshHandle>();

    renderWithProvider(<Homepage ref={ref} />, { state: stateWithPreferences });

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.refresh).toBe('function');
  });

  it('refresh function returns a resolved promise', async () => {
    const ref = createRef<SectionRefreshHandle>();
    renderWithProvider(<Homepage ref={ref} />, { state: stateWithPreferences });

    const result = ref.current?.refresh();

    await expect(result).resolves.toBeUndefined();
  });
});
