import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { WhatsHappeningExploreVariant } from '../abTestConfig';

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

const mockUseABTest = jest.fn();
jest.mock('../../../../hooks', () => ({
  useABTest: (...args: unknown[]) =>
    Reflect.apply(mockUseABTest, undefined, args),
}));

const mockUsePerpsFeed = jest.fn(() => ({
  data: [],
  isLoading: false,
  refetch: jest.fn(),
  defaultSortOptionId: 'priceChange' as const,
}));

jest.mock('../feeds/perps/usePerpsFeed', () => ({
  usePerpsFeed: () => mockUsePerpsFeed(),
}));

const mockNavigateToPerpsMarketList = jest.fn();
jest.mock('../feeds/perps/perpsNavigation', () => ({
  navigateToPerpsMarketList: (
    nav: unknown,
    filter: unknown,
    sortOptionId: unknown,
  ) => mockNavigateToPerpsMarketList(nav, filter, sortOptionId),
}));

interface MockPredictionMarket {
  id: string;
}

const mockUsePredictionsFeed = jest.fn<
  { data: MockPredictionMarket[]; isLoading: boolean },
  []
>(() => ({
  data: [],
  isLoading: false,
}));
jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: () => mockUsePredictionsFeed(),
}));

jest.mock('../feeds/predictions/PredictionRowItem', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    PredictionCarouselRowItem: ({ market }: { market: { id: string } }) =>
      createElement(View, { testID: `predict-market-row-item-${market.id}` }),
  };
});

jest.mock('../components/HorizontalCarousel', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ idPrefix }: { idPrefix: string }) =>
      createElement(View, { testID: `${idPrefix}-flash-list` }),
  };
});

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

jest.mock('../../../UI/WhatsHappening', () => {
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

const predictSectionTestId = 'section-header-view-all-predictions';
const whatsHappeningSectionTestId = 'whats-happening-carousel';

const renderNowTab = (props = defaultTabProps) =>
  render(
    <NavigationContainer>
      <NowTab {...props} />
    </NavigationContainer>,
  );

interface RenderNode {
  props?: {
    testID?: string;
  };
  children?: unknown[] | null;
}

const isRenderNode = (node: unknown): node is RenderNode =>
  Boolean(node) && typeof node === 'object';

const collectTestIds = (node: unknown): string[] => {
  if (Array.isArray(node)) {
    return node.flatMap(collectTestIds);
  }

  if (!isRenderNode(node)) {
    return [];
  }

  const ownTestIds =
    typeof node.props?.testID === 'string' ? [node.props.testID] : [];
  const childTestIds = node.children?.flatMap(collectTestIds) ?? [];

  return [...ownTestIds, ...childTestIds];
};

const getIntroSectionOrder = (tree: unknown) =>
  collectTestIds(tree).filter((testId) =>
    [predictSectionTestId, whatsHappeningSectionTestId].includes(testId),
  );

const mockControlAbTest = () =>
  mockUseABTest.mockReturnValue({
    variant: { whatsHappeningBeforePredict: false },
    variantName: WhatsHappeningExploreVariant.Control,
    isActive: true,
  });

const mockTreatmentAbTest = () =>
  mockUseABTest.mockReturnValue({
    variant: { whatsHappeningBeforePredict: true },
    variantName: WhatsHappeningExploreVariant.Treatment,
    isActive: true,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockControlAbTest();
  mockUsePerpsFeed.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
    defaultSortOptionId: 'priceChange' as const,
  });
  mockUsePredictionsFeed.mockReturnValue({ data: [], isLoading: false });
  mockWhatsHappeningImpl.mockReturnValue(null);
});

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
    mockControlAbTest();
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
        testID: 'whats-happening-carousel',
      }),
    );

    renderNowTab();

    expect(screen.getByTestId('whats-happening-carousel')).toBeOnTheScreen();
  });

  it('does not mount WhatsHappeningSection when the feature flag is disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return false;
      return mockSelectorBase(selector);
    });

    renderNowTab();

    // Section is not even mounted, so the mock should never have been called.
    expect(mockWhatsHappeningImpl).not.toHaveBeenCalled();
    expect(screen.queryByTestId('whats-happening-carousel')).toBeNull();
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

  it('renders Predict before Whats Happening for the control variant', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      if (selector === selectPredictEnabledFlag) return true;
      return mockSelectorBase(selector);
    });
    mockUsePredictionsFeed.mockReturnValue({
      data: [{ id: 'market-1' }],
      isLoading: false,
    });
    mockWhatsHappeningImpl.mockReturnValue(
      React.createElement('View', {
        testID: whatsHappeningSectionTestId,
      }),
    );

    const { toJSON } = renderNowTab();

    expect(getIntroSectionOrder(toJSON())).toEqual([
      predictSectionTestId,
      whatsHappeningSectionTestId,
    ]);
  });

  it('renders Whats Happening before Predict for the treatment variant', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectWhatsHappeningEnabled) return true;
      if (selector === selectPredictEnabledFlag) return true;
      return mockSelectorBase(selector);
    });
    mockTreatmentAbTest();
    mockUsePredictionsFeed.mockReturnValue({
      data: [{ id: 'market-1' }],
      isLoading: false,
    });
    mockWhatsHappeningImpl.mockReturnValue(
      React.createElement('View', {
        testID: whatsHappeningSectionTestId,
      }),
    );

    const { toJSON } = renderNowTab();

    expect(getIntroSectionOrder(toJSON())).toEqual([
      whatsHappeningSectionTestId,
      predictSectionTestId,
    ]);
  });
});

describe('NowTab — Perps Movers "View All" navigation', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  // Selector base: perps enabled, everything else off.
  const mockSelectorBase = (selector: unknown) => {
    if (selector === selectPerpsEnabledFlag) return true;
    if (selector === selectPredictEnabledFlag) return false;
    return undefined;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation(mockSelectorBase);
    mockControlAbTest();
    mockWhatsHappeningImpl.mockReturnValue(null);
  });

  it('calls navigateToPerpsMarketList with "all" filter and the defaultSortOptionId from usePerpsFeed', () => {
    // Return one market so PerpsBlock does not bail out with an early null return.
    mockUsePerpsFeed.mockReturnValue({
      data: [{ market: { symbol: 'BTC' } }] as never,
      isLoading: false,
      refetch: jest.fn(),
      defaultSortOptionId: 'priceChange' as const,
    });

    renderNowTab();

    fireEvent.press(screen.getByTestId('section-header-view-all-perps'));

    expect(mockNavigateToPerpsMarketList).toHaveBeenCalledTimes(1);
    expect(mockNavigateToPerpsMarketList).toHaveBeenCalledWith(
      expect.anything(), // navigation object
      'all',
      'priceChange',
    );
  });

  it('does not render the Perps Movers section when the perps flag is disabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectPredictEnabledFlag) return false;
      return undefined;
    });

    renderNowTab();

    expect(screen.queryByTestId('section-header-view-all-perps')).toBeNull();
  });
});
