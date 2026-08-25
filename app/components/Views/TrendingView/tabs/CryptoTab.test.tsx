import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectExploreEarnSectionEnabledFlag } from '../../../UI/Earn/selectors/featureFlags';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import CryptoTab from './CryptoTab';

const mockNavigate = jest.fn();
const mockEarnSection = jest.fn((_props: Record<string, unknown>) => null);
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseTokensFeed = jest.mocked(useTokensFeed);
const mockUsePredictionsFeed = jest.mocked(usePredictionsFeed);
const mockUsePerpsFeed = jest.mocked(usePerpsFeed);

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../../../UI/Earn/selectors/featureFlags', () => ({
  selectExploreEarnSectionEnabledFlag: jest.fn(),
}));

jest.mock('../../../UI/Earn/components/EarnSection', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockEarnSection(props),
}));

jest.mock('../feeds/tokens/useTokensFeed', () => ({
  useTokensFeed: jest.fn(),
}));

jest.mock('../feeds/predictions/usePredictionsFeed', () => ({
  usePredictionsFeed: jest.fn(),
}));

jest.mock('../feeds/perps/usePerpsFeed', () => ({
  usePerpsFeed: jest.fn(),
}));

jest.mock('../feeds/perps/PerpsSectionProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../components/SectionHeader', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/TileCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../UI/RobinhoodBanner', () => ({
  RobinhoodBanner: () => null,
  RobinhoodBannerSurface: { ExploreCrypto: 'explore_crypto' },
  useRobinhoodBanner: () => ({
    dismiss: jest.fn(),
    handlePress: jest.fn(),
    shouldShow: false,
  }),
}));

jest.mock('../../../UI/Trending/contexts', () => ({
  useTrendingQuickBuySheet: () => ({
    openQuickBuy: jest.fn(),
  }),
}));

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: () => ({
    variant: { showQuickTradeButton: false },
  }),
}));

const defaultTabProps = {
  refresh: { trigger: 0, silentRefresh: true },
  refreshing: false,
  onRefresh: jest.fn(),
};

const arrangeMocks = ({
  perpsEnabled = false,
  earnSectionEnabled = false,
}: {
  perpsEnabled?: boolean;
  earnSectionEnabled?: boolean;
} = {}) => {
  jest.clearAllMocks();

  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
  } as never);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPerpsEnabledFlag) return perpsEnabled;
    if (selector === selectExploreEarnSectionEnabledFlag) {
      return earnSectionEnabled;
    }
    return undefined;
  });

  mockUseTokensFeed.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  } as never);
  mockUsePredictionsFeed.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  } as never);
  mockUsePerpsFeed.mockReturnValue({
    data: [{ market: { symbol: 'BTC' } }],
    isLoading: false,
    refetch: jest.fn(),
    defaultSortOptionId: 'priceChange',
  } as never);
};

const getSectionOrder = (tree: ReturnType<typeof render>['root']): string[] => {
  const sectionIds = new Set([
    'explore-section-crypto_perps',
    'explore-section-earn',
  ]);

  const walk = (node: typeof tree): string[] => {
    const testID = node.props?.testID;
    const ownSection = sectionIds.has(testID) ? [testID] : [];
    const childSections = node.children.flatMap((child) =>
      typeof child === 'string' ? [] : walk(child),
    );

    return [...ownSection, ...childSections];
  };

  return [...new Set(walk(tree))];
};

describe('CryptoTab — Earn section', () => {
  it('renders Earn when the feature flag is enabled', () => {
    arrangeMocks({ earnSectionEnabled: true });

    render(<CryptoTab {...defaultTabProps} />);

    expect(screen.getByTestId('explore-section-earn')).toBeOnTheScreen();
    expect(mockEarnSection).toHaveBeenCalledWith({
      refreshTrigger: 0,
      tokenDetailsSource: TokenDetailsSource.ExploreEarn,
    });
  });

  it('does not render Earn when the feature flag is disabled', () => {
    arrangeMocks();

    render(<CryptoTab {...defaultTabProps} />);

    expect(screen.queryByTestId('explore-section-earn')).not.toBeOnTheScreen();
    expect(mockEarnSection).not.toHaveBeenCalled();
  });

  it('forwards the Explore refresh trigger to Earn', () => {
    arrangeMocks({ earnSectionEnabled: true });

    render(
      <CryptoTab
        {...defaultTabProps}
        refresh={{ trigger: 1, silentRefresh: true }}
      />,
    );

    expect(mockEarnSection).toHaveBeenCalledWith({
      refreshTrigger: 1,
      tokenDetailsSource: TokenDetailsSource.ExploreEarn,
    });
  });
});

describe('CryptoTab — section ordering', () => {
  it('renders Earn immediately after Perps when both sections are enabled', () => {
    arrangeMocks({ perpsEnabled: true, earnSectionEnabled: true });

    const { root } = render(<CryptoTab {...defaultTabProps} />);

    expect(getSectionOrder(root)).toEqual([
      'explore-section-crypto_perps',
      'explore-section-earn',
    ]);
  });
});
