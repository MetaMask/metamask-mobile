import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useNavigateToCardPage } from './useNavigateToCardPage';
import { isCardUrl } from '../../../../util/url';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { BrowserTab } from '../../Tokens/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_ADVANCED_CARD_MANAGEMENT_CLICKED:
      'card_advanced_card_management_clicked',
  },
}));

jest.mock('../../../../util/url', () => ({
  isCardUrl: jest.fn(),
}));

jest.mock('../../../../core/AppConstants', () => ({
  CARD: {
    URL: 'https://card.metamask.io',
  },
}));

describe('useNavigateToCardPage', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(() => 'test-nav'),
    getParent: jest.fn(),
    getState: jest.fn(() => ({
      key: 'test',
      index: 0,
      routeNames: [],
      routes: [],
      type: 'stack',
      stale: false,
    })),
  } as unknown as NavigationProp<ParamListBase>;

  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn(),
  };

  const mockExistingTab: BrowserTab = {
    id: 'existing-tab-id',
    url: 'https://card.metamask.io/dashboard',
  };

  const mockBrowserTabs: BrowserTab[] = [
    {
      id: 'tab-1',
      url: 'https://example.com',
    },
    mockExistingTab,
    {
      id: 'tab-2',
      url: 'https://another-site.com',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useSelector as jest.Mock).mockReturnValue(mockBrowserTabs);
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    (isCardUrl as jest.Mock).mockImplementation(
      (url: string) => url?.includes('card.metamask.io') || false,
    );
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
    mockEventBuilder.build.mockReturnValue({
      event: MetaMetricsEvents.CARD_ADVANCED_CARD_MANAGEMENT_CLICKED,
    });
  });

  it('should initialize correctly and return navigateToCardPage function', () => {
    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    expect(typeof result.current.navigateToCardPage).toBe('function');
  });

  it('should navigate to existing card tab when one exists', () => {
    (isCardUrl as jest.Mock).mockImplementation(
      (url: string) => url === 'https://card.metamask.io/dashboard',
    );

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        existingTabId: 'existing-tab-id',
        newTabUrl: undefined,
        timestamp: expect.any(Number),
      },
    });
  });

  it('should create new tab when no existing card tab is found', () => {
    (isCardUrl as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: 'https://card.metamask.io/',
        timestamp: expect.any(Number),
      },
    });
  });

  it('should track analytics event when navigateToCardPage is called', () => {
    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_ADVANCED_CARD_MANAGEMENT_CLICKED,
    );
    expect(mockEventBuilder.build).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: MetaMetricsEvents.CARD_ADVANCED_CARD_MANAGEMENT_CLICKED,
    });
  });

  it('should handle empty browser tabs array', () => {
    (useSelector as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: 'https://card.metamask.io/',
        timestamp: expect.any(Number),
      },
    });
  });

  it('should handle multiple existing card tabs and use the first one found', () => {
    const multipleBrowserTabs: BrowserTab[] = [
      {
        id: 'card-tab-1',
        url: 'https://card.metamask.io/dashboard',
      },
      {
        id: 'card-tab-2',
        url: 'https://card.metamask.io/settings',
      },
    ];

    (useSelector as jest.Mock).mockReturnValue(multipleBrowserTabs);
    (isCardUrl as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        existingTabId: 'card-tab-1',
        newTabUrl: undefined,
        timestamp: expect.any(Number),
      },
    });
  });

  it('should handle browser tabs selector returning undefined', () => {
    (useSelector as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    expect(() => {
      act(() => {
        result.current.navigateToCardPage();
      });
    }).not.toThrow();
  });

  it('should handle null browser tabs', () => {
    (useSelector as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    expect(() => {
      act(() => {
        result.current.navigateToCardPage();
      });
    }).not.toThrow();
  });

  it('should generate unique timestamps for each call', () => {
    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    const firstCallTime = Date.now();
    act(() => {
      result.current.navigateToCardPage();
    });

    jest.spyOn(Date, 'now').mockReturnValue(firstCallTime + 100);

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);

    const firstCall = (mockNavigation.navigate as jest.Mock).mock.calls[0][1];
    const secondCall = (mockNavigation.navigate as jest.Mock).mock.calls[1][1];

    expect(firstCall.params.timestamp).toBeGreaterThanOrEqual(firstCallTime);
    expect(secondCall.params.timestamp).toBeGreaterThan(
      firstCall.params.timestamp,
    );
  });

  it('should handle isCardUrl function throwing an error', () => {
    (isCardUrl as jest.Mock).mockImplementation(() => {
      throw new Error('URL parsing error');
    });

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    expect(() => {
      act(() => {
        result.current.navigateToCardPage();
      });
    }).toThrow('URL parsing error');
  });

  it('should use correct URL from AppConstants', () => {
    (useSelector as jest.Mock).mockReturnValue([]);
    (isCardUrl as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: expect.objectContaining({
        newTabUrl: 'https://card.metamask.io/',
      }),
    });
  });

  it('should handle navigation prop methods being called', () => {
    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('should handle tabs with missing properties gracefully', () => {
    const incompleteTab = {
      id: 'incomplete-tab',
    } as BrowserTab;

    (useSelector as jest.Mock).mockReturnValue([incompleteTab]);
    (isCardUrl as jest.Mock).mockImplementation((url: string) => {
      if (!url) return false;
      return url.includes('card.metamask.io');
    });

    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    expect(() => {
      act(() => {
        result.current.navigateToCardPage();
      });
    }).not.toThrow();

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: 'https://card.metamask.io/',
        timestamp: expect.any(Number),
      },
    });
  });

  it('should recalculate existing tab when browser tabs change', () => {
    const { result, rerender } = renderHook(() =>
      useNavigateToCardPage(mockNavigation),
    );

    (useSelector as jest.Mock).mockReturnValue([]);
    (isCardUrl as jest.Mock).mockReturnValue(false);

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenLastCalledWith(
      Routes.BROWSER.HOME,
      {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: 'https://card.metamask.io/',
          timestamp: expect.any(Number),
        },
      },
    );

    (useSelector as jest.Mock).mockReturnValue(mockBrowserTabs);
    (isCardUrl as jest.Mock).mockImplementation(
      (url: string) => url === 'https://card.metamask.io/dashboard',
    );

    rerender();

    act(() => {
      result.current.navigateToCardPage();
    });

    expect(mockNavigation.navigate).toHaveBeenLastCalledWith(
      Routes.BROWSER.HOME,
      {
        screen: Routes.BROWSER.VIEW,
        params: {
          existingTabId: 'existing-tab-id',
          newTabUrl: undefined,
          timestamp: expect.any(Number),
        },
      },
    );
  });
});
