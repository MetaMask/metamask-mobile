import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Feed hooks — return empty/not-loading so NowTab renders without network calls.
jest.mock('../feeds/tokens/useTokensFeed', () => ({
  useTokensFeed: jest.fn(() => ({ data: [], isLoading: false })),
}));

jest.mock('../feeds/perps/usePerpsFeed', () => ({
  usePerpsFeed: jest.fn(() => ({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
    defaultSortOptionId: 'priceChange',
  })),
}));

jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: jest.fn(() => ({ data: [], isLoading: false })),
}));

jest.mock('../feeds/stocks/useStocksFeed', () => ({
  useStocksFeed: jest.fn(() => ({ data: [], isLoading: false })),
}));

// Mock PerpsSectionProvider as a transparent passthrough.
jest.mock('../feeds/perps/PerpsSectionProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return ({ children }: { children: unknown }) =>
    createElement(View, null, children);
});

// Mock WhatsHappeningSection to keep its transitive deps (Engine, analytics)
// out of this unit test. We control rendering via mockWhatsHappeningImpl.
const mockWhatsHappeningImpl = jest.fn<React.ReactElement | null, [unknown]>(
  () => null,
);

jest.mock('../../Homepage/Sections/WhatsHappening', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { forwardRef } = require('react');
  return {
    __esModule: true,
    default: forwardRef((_props: unknown, ref: unknown) =>
      mockWhatsHappeningImpl(ref),
    ),
  };
});

import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { selectWhatsHappeningEnabled } from '../../../../selectors/featureFlagController/whatsHappening';
import NowTab from './NowTab';
import type { RefreshConfig } from '../hooks/useExploreRefresh';

const defaultRefresh: RefreshConfig = { trigger: 0, silentRefresh: true };
const defaultTabProps = {
  refresh: defaultRefresh,
  refreshing: false,
  onRefresh: jest.fn(),
};

const renderNowTab = (props = defaultTabProps) =>
  render(
    <NavigationContainer>
      <NowTab {...props} />
    </NavigationContainer>,
  );

describe('NowTab — WhatsHappeningSection integration', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  const mockSelectorBase = (selector: unknown) => {
    if (selector === selectPerpsEnabledFlag) return false;
    if (selector === selectPredictEnabledFlag) return false;
    return undefined;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation(mockSelectorBase);
    // Default: section mock renders nothing; individual tests override as needed.
    mockWhatsHappeningImpl.mockReturnValue(null);
  });

  it('mounts WhatsHappeningSection and renders it when the feature flag is enabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      return mockSelectorBase(selector);
    });
    (mockWhatsHappeningImpl as jest.Mock).mockReturnValue(
      React.createElement('View', {
        testID: 'homepage-whats-happening-carousel',
      }),
    );

    renderNowTab();

    expect(
      screen.getByTestId('homepage-whats-happening-carousel'),
    ).toBeOnTheScreen();
  });

  it('does not mount WhatsHappeningSection when the feature flag is disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return false;
      return mockSelectorBase(selector);
    });

    renderNowTab();

    // Section is not even mounted, so the mock should never have been called.
    expect(mockWhatsHappeningImpl).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('homepage-whats-happening-carousel'),
    ).toBeNull();
  });

  it('passes a ref to WhatsHappeningSection so pull-to-refresh can trigger it', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      return mockSelectorBase(selector);
    });

    renderNowTab();

    // The mock's first argument is the forwarded ref (we dropped props in the mock).
    // It should be a React ref object so the useEffect bridge can call .refresh().
    expect(mockWhatsHappeningImpl).toHaveBeenCalled();
    const [forwardedRef] = mockWhatsHappeningImpl.mock.calls[0];
    expect(forwardedRef).not.toBeNull();
  });
});
