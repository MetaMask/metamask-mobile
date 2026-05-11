import React from 'react';
import { InteractionManager, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { SectionRefreshHandle } from '../../types';
import HomepageDiscoveryTabs from './HomepageDiscoveryTabs';
import { HomeTabNames } from '../../hooks/useTabViewedEvent';

const mockTrackTabViewed = jest.fn();
jest.mock('../../hooks/useTabViewedEvent', () => ({
  __esModule: true,
  HomeTabNames: {
    PORTFOLIO: 'portfolio',
    PERPETUALS: 'perpetuals',
    PREDICTIONS: 'predictions',
  },
  default: () => ({ trackTabViewed: mockTrackTabViewed }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.ScrollView = jest.requireActual('react-native').ScrollView;
  return Reanimated;
});

jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation((task) => {
    if (task == null) {
      return { cancel: jest.fn(), then: jest.fn(), done: jest.fn() };
    }
    if (typeof task === 'function') {
      task();
    } else {
      // eslint-disable-next-line no-void
      void task.gen();
    }
    return { cancel: jest.fn(), then: jest.fn(), done: jest.fn() };
  });

jest.mock('../../Homepage', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactLib.forwardRef(
      (
        _props: Record<string, never>,
        ref: React.ForwardedRef<SectionRefreshHandle>,
      ) => {
        ReactLib.useImperativeHandle(ref, () => ({
          refresh: jest.fn(async () => undefined),
        }));
        return ReactLib.createElement(View, { testID: 'homepage' });
      },
    ),
  };
});

jest.mock('../../../../UI/Perps/Views/PerpsHomeView/PerpsHomeView', () => {
  const { View } = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');
  return function MockPerpsHomeView({
    tabEnterCallbackRef,
  }: {
    tabEnterCallbackRef?: React.MutableRefObject<(() => void) | null>;
  }) {
    if (tabEnterCallbackRef) tabEnterCallbackRef.current = jest.fn();
    return ReactLib.createElement(View, { testID: 'perps-home-view' });
  };
});

const mockPredictFeedProps: { current: Record<string, unknown> | null } = {
  current: null,
};
jest.mock('../../../../UI/Predict/views/PredictFeed', () => {
  const { View } = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');
  return function MockPredictFeed(props: Record<string, unknown>) {
    mockPredictFeedProps.current = props;
    return ReactLib.createElement(View, { testID: 'predict-feed' });
  };
});

jest.mock('../../../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../../../UI/Predict/contexts', () => ({
  PredictPreviewSheetProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../../../UI/Predict/hooks/useDiscoveryScrollManager', () => ({
  useDiscoveryScrollManager: jest.fn(() => ({
    scrollHandler: jest.fn(),
    onTabEnter: jest.fn(),
    headerHidden: false,
  })),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ themeAppearance: 'dark', colors: {} }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: () => ({}) }),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

const pressTab = async (label: string) => {
  await act(async () => {
    fireEvent.press(screen.getAllByText(label)[0]);
  });
};

const renderComponent = (props = {}) =>
  render(<HomepageDiscoveryTabs {...props} />);

describe('HomepageDiscoveryTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial render', () => {
    it('renders the Portfolio tab bar label', () => {
      renderComponent();
      expect(screen.getByText('Portfolio')).toBeOnTheScreen();
    });

    it('renders the Perpetuals tab bar label', () => {
      renderComponent();
      expect(screen.getByText('Perpetuals')).toBeOnTheScreen();
    });

    it('renders the Predictions tab bar label', () => {
      renderComponent();
      expect(screen.getByText('Predictions')).toBeOnTheScreen();
    });

    it('shows Portfolio content on initial mount', () => {
      renderComponent();
      expect(screen.getByTestId('homepage')).toBeOnTheScreen();
    });
  });

  describe('tab switching', () => {
    it('shows Perpetuals content after pressing the Perpetuals tab', async () => {
      renderComponent();
      await pressTab('Perpetuals');
      expect(screen.getByTestId('perps-home-view')).toBeOnTheScreen();
    });

    it('shows Predictions content after pressing the Predictions tab', async () => {
      renderComponent();
      await pressTab('Predictions');
      expect(screen.getByTestId('predict-feed')).toBeOnTheScreen();
    });

    it('returns to Portfolio content after switching back', async () => {
      renderComponent();
      await pressTab('Perpetuals');
      await pressTab('Portfolio');
      expect(screen.getByTestId('homepage')).toBeOnTheScreen();
    });
  });

  describe('portfolioHeader prop', () => {
    it('renders portfolioHeader inside the Portfolio tab', () => {
      renderComponent({
        portfolioHeader: <Text testID="portfolio-header">Header</Text>,
      });
      expect(screen.getByTestId('portfolio-header')).toBeOnTheScreen();
    });

    it('keeps portfolioHeader mounted but hidden when switching to Perpetuals', async () => {
      renderComponent({
        portfolioHeader: <Text testID="portfolio-header">Header</Text>,
      });
      await pressTab('Perpetuals');
      // Portfolio tab is keepMounted — header stays in tree but is not accessible
      // (pointerEvents="none" + display:none via twClassName="hidden")
      expect(screen.queryByTestId('perps-home-view')).toBeOnTheScreen();
    });
  });

  describe('ref / imperative handle', () => {
    it('exposes a refresh method via ref', () => {
      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      render(<HomepageDiscoveryTabs ref={ref} />);
      expect(typeof ref.current?.refresh).toBe('function');
    });

    it('calling refresh does not throw', async () => {
      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      render(<HomepageDiscoveryTabs ref={ref} />);
      await act(async () => {
        await ref.current?.refresh();
      });
    });
  });

  describe('walletHeaderOffset prop', () => {
    it('renders without throwing when walletHeaderOffset is provided', () => {
      expect(() => renderComponent({ walletHeaderOffset: 100 })).not.toThrow();
    });

    it('renders without throwing when walletHeaderOffset is 0', () => {
      expect(() => renderComponent({ walletHeaderOffset: 0 })).not.toThrow();
    });
  });

  describe('PredictFeed wallet header forwarding', () => {
    beforeEach(() => {
      mockPredictFeedProps.current = null;
    });

    it('forwards walletHeaderTranslateY and walletHeaderHeight to PredictFeed', async () => {
      const walletHeaderTranslateY = { value: 0 } as unknown;
      renderComponent({
        walletHeaderTranslateY,
        walletHeaderHeight: 120,
      });
      await pressTab('Predictions');

      expect(mockPredictFeedProps.current).not.toBeNull();
      expect(mockPredictFeedProps.current?.walletHeaderTranslateY).toBe(
        walletHeaderTranslateY,
      );
      expect(mockPredictFeedProps.current?.walletHeaderHeight).toBe(120);
    });

    it('passes onHeaderHiddenChange to PredictFeed so discovery icons collapse', async () => {
      renderComponent();
      await pressTab('Predictions');

      expect(typeof mockPredictFeedProps.current?.onHeaderHiddenChange).toBe(
        'function',
      );
    });

    it('passes hideHeader=true to PredictFeed', async () => {
      renderComponent();
      await pressTab('Predictions');

      expect(mockPredictFeedProps.current?.hideHeader).toBe(true);
    });
  });

  describe('tab_viewed analytics', () => {
    it('fires trackTabViewed with portfolio on initial mount', () => {
      renderComponent();
      expect(mockTrackTabViewed).toHaveBeenCalledWith(HomeTabNames.PORTFOLIO);
    });

    it('fires trackTabViewed with perpetuals when switching to Perpetuals tab', async () => {
      renderComponent();
      mockTrackTabViewed.mockClear();
      await pressTab('Perpetuals');
      expect(mockTrackTabViewed).toHaveBeenCalledWith(HomeTabNames.PERPETUALS);
    });

    it('fires trackTabViewed with predictions when switching to Predictions tab', async () => {
      renderComponent();
      mockTrackTabViewed.mockClear();
      await pressTab('Predictions');
      expect(mockTrackTabViewed).toHaveBeenCalledWith(HomeTabNames.PREDICTIONS);
    });

    it('fires trackTabViewed with portfolio when switching back to Portfolio', async () => {
      renderComponent();
      await pressTab('Perpetuals');
      mockTrackTabViewed.mockClear();
      await pressTab('Portfolio');
      expect(mockTrackTabViewed).toHaveBeenCalledWith(HomeTabNames.PORTFOLIO);
    });

    it('does not fire trackTabViewed again when pressing the active tab', async () => {
      renderComponent();
      mockTrackTabViewed.mockClear();
      await pressTab('Portfolio');
      expect(mockTrackTabViewed).not.toHaveBeenCalled();
    });

    it('fires once per distinct tab switch across multiple switches', async () => {
      renderComponent();
      mockTrackTabViewed.mockClear();
      await pressTab('Perpetuals');
      await pressTab('Predictions');
      await pressTab('Portfolio');
      expect(mockTrackTabViewed).toHaveBeenCalledTimes(3);
    });
  });
});
