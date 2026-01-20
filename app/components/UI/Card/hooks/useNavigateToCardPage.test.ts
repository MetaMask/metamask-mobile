import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../../types/navigation';
import {
  useNavigateToCardPage,
  useNavigateToInternalBrowserPage,
  CardInternalBrowserPage,
} from './useNavigateToCardPage';
import { isCardUrl, isCardTravelUrl } from '../../../../util/url';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { BrowserTab } from '../../Tokens/types';
import { CardActions } from '../util/metrics';
import { Linking } from 'react-native';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_BUTTON_CLICKED: 'card_button_clicked',
  },
}));

jest.mock('../../../../util/url', () => ({
  isCardUrl: jest.fn(),
  isCardTravelUrl: jest.fn(),
  isCardTosUrl: jest.fn(),
}));

jest.mock('../../../../core/AppConstants', () => ({
  CARD: {
    URL: 'https://card.metamask.io',
    TRAVEL_URL: 'https://travel.metamask.io/access',
    CARD_TOS_URL: 'https://secure.baanx.co.uk/MM-Card-RoW-Terms-2025-Sept.pdf',
  },
}));

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

// Browser navigation test config (excludes TOS which uses Linking)
const BROWSER_PAGE_CONFIG = [
  {
    page: CardInternalBrowserPage.CARD,
    url: 'https://card.metamask.io',
    urlCheckFn: isCardUrl,
    action: CardActions.NAVIGATE_TO_CARD_PAGE,
    tabId: 'card-tab-id',
  },
  {
    page: CardInternalBrowserPage.TRAVEL,
    url: 'https://travel.metamask.io/access',
    urlCheckFn: isCardTravelUrl,
    action: CardActions.NAVIGATE_TO_TRAVEL_PAGE,
    tabId: 'travel-tab-id',
  },
] as const;

const createMockNavigation = (): NavigationProp<RootParamList> =>
  ({
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
  }) as unknown as NavigationProp<RootParamList>;

const createMockBrowserTab = (
  overrides: Partial<BrowserTab> = {},
): BrowserTab => ({
  id: 'tab-id',
  url: 'https://example.com',
  ...overrides,
});

const createMockEventBuilder = () => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({
    event: MetaMetricsEvents.CARD_BUTTON_CLICKED,
  }),
});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

const setupMocks = (
  mockEventBuilder: ReturnType<typeof createMockEventBuilder>,
) => {
  (useSelector as jest.Mock).mockReturnValue([]);
  (useMetrics as jest.Mock).mockReturnValue({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  });
  (isCardUrl as jest.Mock).mockReturnValue(false);
  (isCardTravelUrl as jest.Mock).mockReturnValue(false);
  mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
};

describe('useNavigateToInternalBrowserPage', () => {
  let mockNavigation: NavigationProp<RootParamList>;
  let mockEventBuilder: ReturnType<typeof createMockEventBuilder>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation = createMockNavigation();
    mockEventBuilder = createMockEventBuilder();
    setupMocks(mockEventBuilder);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns navigateToInternalBrowserPage function', () => {
    const { result } = renderHook(() =>
      useNavigateToInternalBrowserPage(mockNavigation),
    );

    expect(typeof result.current.navigateToInternalBrowserPage).toBe(
      'function',
    );
  });

  describe.each(BROWSER_PAGE_CONFIG)(
    'CardInternalBrowserPage.$page',
    ({ page, url, urlCheckFn, action, tabId }) => {
      beforeEach(() => {
        jest.clearAllMocks();
        mockNavigation = createMockNavigation();
        mockEventBuilder = createMockEventBuilder();
        setupMocks(mockEventBuilder);
      });

      it('creates new tab when no existing tab found', () => {
        const { result } = renderHook(() =>
          useNavigateToInternalBrowserPage(mockNavigation),
        );

        act(() => {
          result.current.navigateToInternalBrowserPage(page);
        });

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.BROWSER.HOME,
          expect.objectContaining({
            screen: Routes.BROWSER.VIEW,
            params: expect.objectContaining({
              newTabUrl: url,
            }),
          }),
        );
      });

      it('navigates to existing tab when one exists', () => {
        const tab = createMockBrowserTab({ id: tabId, url });
        (useSelector as jest.Mock).mockReturnValue([tab]);
        (urlCheckFn as jest.Mock).mockReturnValue(true);

        const { result } = renderHook(() =>
          useNavigateToInternalBrowserPage(mockNavigation),
        );

        act(() => {
          result.current.navigateToInternalBrowserPage(page);
        });

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.BROWSER.HOME,
          expect.objectContaining({
            screen: Routes.BROWSER.VIEW,
            params: expect.objectContaining({
              existingTabId: tabId,
              newTabUrl: undefined,
            }),
          }),
        );
      });

      it(`tracks CARD_BUTTON_CLICKED with ${action} action`, () => {
        const { result } = renderHook(() =>
          useNavigateToInternalBrowserPage(mockNavigation),
        );

        act(() => {
          result.current.navigateToInternalBrowserPage(page);
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_BUTTON_CLICKED,
        );
        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({ action });
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    },
  );

  describe('CardInternalBrowserPage.TOS', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockNavigation = createMockNavigation();
      mockEventBuilder = createMockEventBuilder();
      setupMocks(mockEventBuilder);
    });

    it('opens TOS URL with Linking.openURL', () => {
      const { result } = renderHook(() =>
        useNavigateToInternalBrowserPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToInternalBrowserPage(
          CardInternalBrowserPage.TOS,
        );
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://secure.baanx.co.uk/MM-Card-RoW-Terms-2025-Sept.pdf',
      );
    });

    it('does not navigate to browser when opening TOS', () => {
      const { result } = renderHook(() =>
        useNavigateToInternalBrowserPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToInternalBrowserPage(
          CardInternalBrowserPage.TOS,
        );
      });

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it.each([undefined, null, []])(
      'handles browser tabs as %p without throwing',
      (tabsValue) => {
        (useSelector as jest.Mock).mockReturnValue(tabsValue);

        const { result } = renderHook(() =>
          useNavigateToInternalBrowserPage(mockNavigation),
        );

        expect(() => {
          act(() => {
            result.current.navigateToInternalBrowserPage(
              CardInternalBrowserPage.CARD,
            );
          });
        }).not.toThrow();
      },
    );

    it('uses first matching tab when multiple exist', () => {
      const tabs = [
        createMockBrowserTab({
          id: 'first-tab',
          url: 'https://card.metamask.io/page1',
        }),
        createMockBrowserTab({
          id: 'second-tab',
          url: 'https://card.metamask.io/page2',
        }),
      ];
      (useSelector as jest.Mock).mockReturnValue(tabs);
      (isCardUrl as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useNavigateToInternalBrowserPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToInternalBrowserPage(
          CardInternalBrowserPage.CARD,
        );
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.objectContaining({
          params: expect.objectContaining({ existingTabId: 'first-tab' }),
        }),
      );
    });
  });
});

describe('useNavigateToCardPage', () => {
  let mockNavigation: NavigationProp<RootParamList>;
  let mockEventBuilder: ReturnType<typeof createMockEventBuilder>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation = createMockNavigation();
    mockEventBuilder = createMockEventBuilder();
    setupMocks(mockEventBuilder);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns all three navigation functions', () => {
    const { result } = renderHook(() => useNavigateToCardPage(mockNavigation));

    expect(typeof result.current.navigateToCardPage).toBe('function');
    expect(typeof result.current.navigateToTravelPage).toBe('function');
    expect(typeof result.current.navigateToCardTosPage).toBe('function');
  });

  describe('navigateToCardPage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockNavigation = createMockNavigation();
      mockEventBuilder = createMockEventBuilder();
      setupMocks(mockEventBuilder);
    });

    it('navigates to card URL in browser', () => {
      const { result } = renderHook(() =>
        useNavigateToCardPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToCardPage();
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.objectContaining({
          screen: Routes.BROWSER.VIEW,
          params: expect.objectContaining({
            newTabUrl: 'https://card.metamask.io',
          }),
        }),
      );
    });

    it('tracks CARD_BUTTON_CLICKED with NAVIGATE_TO_CARD_PAGE action', () => {
      const { result } = renderHook(() =>
        useNavigateToCardPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToCardPage();
      });

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        action: CardActions.NAVIGATE_TO_CARD_PAGE,
      });
    });
  });

  describe('navigateToTravelPage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockNavigation = createMockNavigation();
      mockEventBuilder = createMockEventBuilder();
      setupMocks(mockEventBuilder);
    });

    it('navigates to travel URL in browser', () => {
      const { result } = renderHook(() =>
        useNavigateToCardPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToTravelPage();
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.objectContaining({
          screen: Routes.BROWSER.VIEW,
          params: expect.objectContaining({
            newTabUrl: 'https://travel.metamask.io/access',
          }),
        }),
      );
    });

    it('tracks CARD_BUTTON_CLICKED with NAVIGATE_TO_TRAVEL_PAGE action', () => {
      const { result } = renderHook(() =>
        useNavigateToCardPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToTravelPage();
      });

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        action: CardActions.NAVIGATE_TO_TRAVEL_PAGE,
      });
    });
  });

  describe('navigateToCardTosPage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockNavigation = createMockNavigation();
      mockEventBuilder = createMockEventBuilder();
      setupMocks(mockEventBuilder);
    });

    it('opens TOS URL with Linking.openURL', () => {
      const { result } = renderHook(() =>
        useNavigateToCardPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToCardTosPage();
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://secure.baanx.co.uk/MM-Card-RoW-Terms-2025-Sept.pdf',
      );
    });

    it('does not navigate to browser', () => {
      const { result } = renderHook(() =>
        useNavigateToCardPage(mockNavigation),
      );

      act(() => {
        result.current.navigateToCardTosPage();
      });

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  it('returns stable function references across rerenders', () => {
    const { result, rerender } = renderHook(() =>
      useNavigateToCardPage(mockNavigation),
    );

    const initialFunctions = { ...result.current };
    rerender();

    expect(result.current.navigateToCardPage).toBe(
      initialFunctions.navigateToCardPage,
    );
    expect(result.current.navigateToTravelPage).toBe(
      initialFunctions.navigateToTravelPage,
    );
    expect(result.current.navigateToCardTosPage).toBe(
      initialFunctions.navigateToCardTosPage,
    );
  });
});
