import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { selectExplorePageV2EnabledFlag } from '../../../selectors/featureFlagController/explorePageV2';
import { EXPLORE_TAB_INDEX } from '../../Views/TrendingView/TrendingView';
import { DefiEmptyState } from './DefiEmptyState';

// Mock the navigation hook
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
}));

jest.mock('../../../selectors/featureFlagController/explorePageV2', () => ({
  selectExplorePageV2EnabledFlag: jest.fn(),
}));

const mockSelectExplorePageV2EnabledFlag = jest.mocked(
  selectExplorePageV2EnabledFlag,
);

describe('DefiEmptyState', () => {
  beforeEach(() => {
    mockSelectExplorePageV2EnabledFlag.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<DefiEmptyState />);
    expect(
      getByText('Lend, borrow, and trade, right in your wallet.'),
    ).toBeDefined();
    expect(getByText('Explore DeFi')).toBeDefined();
  });

  it('opens Explore v2 on the Sites tab', () => {
    const { getByText } = renderWithProvider(<DefiEmptyState />);

    const button = getByText('Explore DeFi');
    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('TrendingView', {
      screen: 'TrendingFeed',
      params: {
        initialTab: EXPLORE_TAB_INDEX.SITES,
      },
    });
  });

  it('opens Explore v1 main feed then Sites full view', () => {
    mockSelectExplorePageV2EnabledFlag.mockReturnValue(false);

    const { getByText } = renderWithProvider(<DefiEmptyState />);

    const button = getByText('Explore DeFi');
    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenNthCalledWith(1, 'TrendingView', {
      screen: 'TrendingFeed',
    });
    expect(mockNavigate).toHaveBeenNthCalledWith(2, 'SitesFullView');
  });
});
