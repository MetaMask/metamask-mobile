import React from 'react';
import { InteractionManager, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { SectionRefreshHandle } from '../../types';
import HomepageDiscoveryTabs from './HomepageDiscoveryTabs';

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

jest.mock('../../../../UI/Predict/views/PredictFeed', () => {
  const { View } = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');
  return function MockPredictFeed() {
    return ReactLib.createElement(View, { testID: 'predict-feed' });
  };
});

jest.mock('../../../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const mockPauseAllChannels = jest.fn();
const mockResumeAllChannels = jest.fn();

jest.mock('../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  getStreamManagerInstance: () => ({
    pauseAllChannels: mockPauseAllChannels,
    resumeAllChannels: mockResumeAllChannels,
  }),
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

  describe('Perps WS pause/resume on tab switch', () => {
    it('pauses channels when switching from Portfolio to Predictions', async () => {
      renderComponent();
      await pressTab('Predictions');
      expect(mockPauseAllChannels).toHaveBeenCalledTimes(1);
      expect(mockResumeAllChannels).not.toHaveBeenCalled();
    });

    it('pauses channels when switching from Perpetuals to Predictions', async () => {
      renderComponent();
      await pressTab('Perpetuals');
      mockPauseAllChannels.mockClear();
      mockResumeAllChannels.mockClear();
      await pressTab('Predictions');
      expect(mockPauseAllChannels).toHaveBeenCalledTimes(1);
      expect(mockResumeAllChannels).not.toHaveBeenCalled();
    });

    it('resumes channels when switching from Predictions to Portfolio', async () => {
      renderComponent();
      await pressTab('Predictions');
      mockPauseAllChannels.mockClear();
      mockResumeAllChannels.mockClear();
      await pressTab('Portfolio');
      expect(mockResumeAllChannels).toHaveBeenCalledTimes(1);
      expect(mockPauseAllChannels).not.toHaveBeenCalled();
    });

    it('resumes channels when switching from Predictions to Perpetuals', async () => {
      renderComponent();
      await pressTab('Predictions');
      mockPauseAllChannels.mockClear();
      mockResumeAllChannels.mockClear();
      await pressTab('Perpetuals');
      expect(mockResumeAllChannels).toHaveBeenCalledTimes(1);
      expect(mockPauseAllChannels).not.toHaveBeenCalled();
    });

    it('does not pause or resume when switching between Portfolio and Perpetuals', async () => {
      renderComponent();
      mockPauseAllChannels.mockClear();
      mockResumeAllChannels.mockClear();
      await pressTab('Perpetuals');
      await pressTab('Portfolio');
      expect(mockPauseAllChannels).not.toHaveBeenCalled();
      expect(mockResumeAllChannels).not.toHaveBeenCalled();
    });

    it('does not pause or resume when pressing the active tab', async () => {
      renderComponent();
      mockPauseAllChannels.mockClear();
      mockResumeAllChannels.mockClear();
      await pressTab('Portfolio');
      expect(mockPauseAllChannels).not.toHaveBeenCalled();
      expect(mockResumeAllChannels).not.toHaveBeenCalled();
    });
  });

  describe('Perps WS cleanup on unmount', () => {
    it('calls resumeAllChannels on unmount so channels are never left paused', async () => {
      const { unmount } = renderComponent();
      await pressTab('Predictions');
      mockResumeAllChannels.mockClear();
      unmount();
      expect(mockResumeAllChannels).toHaveBeenCalledTimes(1);
    });
  });
});
