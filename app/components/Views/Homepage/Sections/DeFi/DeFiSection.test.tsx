import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import DeFiSection from './DeFiSection';

jest.mock(
  '../../../../../selectors/featureFlagController/assetsDefiPositions',
  () => ({
    selectAssetsDefiPositionsEnabled: jest.fn(() => true),
  }),
);

describe('DeFiSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return value to default (true) to ensure test isolation
    jest
      .requireMock(
        '../../../../../selectors/featureFlagController/assetsDefiPositions',
      )
      .selectAssetsDefiPositionsEnabled.mockReturnValue(true);
  });

  it('renders section title when enabled', () => {
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
});
