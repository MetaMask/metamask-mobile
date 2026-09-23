import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import {
  EARN_MODULE_BUTTON_INTENTS,
  EARN_MODULE_BUTTON_TYPES,
  EARN_MODULE_BOTTOM_SHEET_NAMES,
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_REDIRECT_TARGETS,
  EARN_MODULE_SCREEN_NAMES,
} from '../constants/earnModuleEvents';
import { useEarnAnalytics } from './useEarnAnalytics';

jest.mock('../../../hooks/useAnalytics/useAnalytics');
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, options?: { locale?: string }) =>
    `${options?.locale === 'en' ? 'en' : 'localized'}:${key}`,
}));

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ name: 'built-event' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
});

describe('useEarnAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
  });

  it('tracks a component view with Earn-only location properties', () => {
    const { result } = renderHook(() =>
      useEarnAnalytics({
        component_name: EARN_MODULE_COMPONENT_NAMES.HOMEPAGE_EARN_SECTION,
        entry_point: EARN_MODULE_ENTRY_POINTS.HOMEPAGE,
      }),
    );

    result.current.trackComponentViewed();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.EARN_MODULE_SURFACE_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.HOMEPAGE_EARN_SECTION,
      entry_point: EARN_MODULE_ENTRY_POINTS.HOMEPAGE,
    });
    expect(mockAddProperties.mock.calls[0][0]).not.toHaveProperty(
      'is_account_funded',
    );
    expect(mockAddProperties.mock.calls[0][0]).not.toHaveProperty(
      'surface_type',
    );
  });

  it('tracks a screen view with screen location properties', () => {
    const { result } = renderHook(() =>
      useEarnAnalytics({
        screen_name: EARN_MODULE_SCREEN_NAMES.EARN_SECTION_LIST_VIEW,
        entry_point: EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
      }),
    );

    result.current.trackScreenViewed();

    expect(mockAddProperties).toHaveBeenCalledWith({
      screen_name: EARN_MODULE_SCREEN_NAMES.EARN_SECTION_LIST_VIEW,
      entry_point: EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
    });
  });

  it('tracks a bottom sheet view with bottom sheet location properties', () => {
    const { result } = renderHook(() =>
      useEarnAnalytics({
        bottom_sheet_name:
          EARN_MODULE_BOTTOM_SHEET_NAMES.STRATEGY_SELECTION_MODAL,
        entry_point: EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
      }),
    );

    result.current.trackBottomSheetViewed();

    expect(mockAddProperties).toHaveBeenCalledWith({
      bottom_sheet_name:
        EARN_MODULE_BOTTOM_SHEET_NAMES.STRATEGY_SELECTION_MODAL,
      entry_point: EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
    });
  });

  it('omits optional location properties when they are not provided', () => {
    const { result } = renderHook(() =>
      useEarnAnalytics({
        entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_SEARCH,
      }),
    );

    result.current.trackScreenViewed();

    expect(mockAddProperties).toHaveBeenCalledWith({
      entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_SEARCH,
    });
  });

  it('derives labels and redirect type for text buttons', () => {
    const { result } = renderHook(() =>
      useEarnAnalytics({
        bottom_sheet_name:
          EARN_MODULE_BOTTOM_SHEET_NAMES.STRATEGY_SELECTION_MODAL,
        entry_point: EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
      }),
    );

    result.current.trackButtonClicked({
      button_type: EARN_MODULE_BUTTON_TYPES.TEXT,
      button_intent: EARN_MODULE_BUTTON_INTENTS.DEPOSIT,
      label_key: 'earn.strategy_selection.get_started',
      redirect_target: EARN_MODULE_REDIRECT_TARGETS.MONEY_HOME,
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        label_en: 'en:earn.strategy_selection.get_started',
        label_localized: 'localized:earn.strategy_selection.get_started',
        redirect_target: EARN_MODULE_REDIRECT_TARGETS.MONEY_HOME,
        redirect_target_type: 'screen',
      }),
    );
  });

  it('tracks non-button surfaces without adding button properties', () => {
    const { result } = renderHook(() =>
      useEarnAnalytics({
        component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SEARCH_ROW,
        entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_SEARCH,
      }),
    );

    result.current.trackSurfaceClicked({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SEARCH_ASSET_ROW,
      asset_symbol: 'USDC',
      redirect_target: EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS,
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.EARN_MODULE_SURFACE_CLICKED,
    );
    expect(mockAddProperties.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SEARCH_ASSET_ROW,
        asset_symbol: 'USDC',
        redirect_target_type: 'screen',
      }),
    );
    expect(mockAddProperties.mock.calls[0][0]).not.toHaveProperty(
      'button_intent',
    );
  });

  it('tracks icon buttons without text label properties', () => {
    const { result } = renderHook(() =>
      useEarnAnalytics({
        entry_point: EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
      }),
    );

    result.current.trackButtonClicked({
      button_type: EARN_MODULE_BUTTON_TYPES.ICON,
      button_intent: EARN_MODULE_BUTTON_INTENTS.GO_BACK,
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.EARN_MODULE_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      entry_point: EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
      button_type: EARN_MODULE_BUTTON_TYPES.ICON,
      button_intent: EARN_MODULE_BUTTON_INTENTS.GO_BACK,
    });
  });
});
