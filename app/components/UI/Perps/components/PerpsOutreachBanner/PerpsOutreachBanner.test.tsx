import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { fireEvent, render } from '@testing-library/react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { SlideInUp } from 'react-native-reanimated';
import bannersReducer from '../../../../../reducers/banners';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import AppConstants from '../../../../../core/AppConstants';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsOutreachBanner } from '../../hooks/usePerpsOutreachBanner';
import { getPerpsOutreachDismissalKey } from '../../hooks/usePerpsOutreachCampaign';
import PerpsOutreachBanner, {
  PERPS_OUTREACH_BANNER_INTERACTION,
} from './PerpsOutreachBanner';
import { PerpsOutreachBannerSelectorsIDs } from './PerpsOutreachBanner.testIds';

const mockParseDeeplink = jest.fn().mockResolvedValue(true);

jest.mock('../../../../../core/DeeplinkManager/DeeplinkManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({ parse: mockParseDeeplink }),
  },
}));

const mockTrack = jest.fn();

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('../../hooks/usePerpsOutreachBanner', () => ({
  usePerpsOutreachBanner: jest.fn(),
}));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  SlideInUp: { duration: jest.fn(() => 'slide-in-up-transition') },
}));

const TOP_INSET = 47;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 47,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

const mockUsePerpsOutreachBanner = jest.mocked(usePerpsOutreachBanner);
const mockUsePerpsEventTracking = jest.mocked(usePerpsEventTracking);

const flattenStyle = (node: { props: Record<string, unknown> }) =>
  StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>);

const BANNER = {
  id: 'mobile-outreach-2026-09',
  title: "You're a top perp trader",
  body: 'Shape what we build next.',
  imageUrl: 'https://metamask.io/images/mobile-perps-outreach.png',
  linkUrl: 'https://link.metamask.io/perps-outreach',
};

const createStore = (dismissedBanners: string[] = []) =>
  configureStore({
    reducer: {
      banners: bannersReducer,
    },
    preloadedState: {
      banners: {
        dismissedBanners,
        lastDismissedBrazeBanner: null,
      },
    },
  });

const renderBanner = (
  dismissedBanners: string[] = [],
  props: Partial<React.ComponentProps<typeof PerpsOutreachBanner>> = {},
) => {
  const store = createStore(dismissedBanners);
  return {
    store,
    ...render(
      <Provider store={store}>
        <PerpsOutreachBanner location="perps_home" {...props} />
      </Provider>,
    ),
  };
};

describe('PerpsOutreachBanner', () => {
  beforeEach(() => {
    mockUsePerpsEventTracking.mockReturnValue({
      track: mockTrack,
    });
    mockUsePerpsOutreachBanner.mockReturnValue({
      data: BANNER,
    } as ReturnType<typeof usePerpsOutreachBanner>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the server-provided campaign content', () => {
    const { getByTestId, getByText } = renderBanner();

    expect(
      getByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).toBeOnTheScreen();
    expect(getByText(BANNER.title)).toBeOnTheScreen();
    expect(getByText(BANNER.body)).toBeOnTheScreen();
    expect(getByTestId(PerpsOutreachBannerSelectorsIDs.IMAGE)).toHaveProp(
      'source',
      { uri: BANNER.imageUrl },
    );
  });

  it('tracks an impression when the eligible campaign is shown', () => {
    renderBanner([], { location: 'perp_market_details' });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_OUTREACH_BANNER_INTERACTION.VIEWED,
        [PERPS_EVENT_PROPERTY.LOCATION]: 'perp_market_details',
        campaign_id: BANNER.id,
      },
    );
  });

  it('renders nothing without an eligible campaign', () => {
    mockUsePerpsOutreachBanner.mockReturnValue({
      data: null,
    } as ReturnType<typeof usePerpsOutreachBanner>);

    const { queryByTestId } = renderBanner();

    expect(
      queryByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('renders nothing when the campaign was dismissed', () => {
    const { queryByTestId } = renderBanner([
      getPerpsOutreachDismissalKey(BANNER.id),
    ]);

    expect(
      queryByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('persists dismissal for the current campaign', () => {
    const { getByTestId, queryByTestId, store } = renderBanner();

    fireEvent.press(getByTestId(PerpsOutreachBannerSelectorsIDs.CLOSE_BUTTON));

    expect(store.getState().banners.dismissedBanners).toContain(
      getPerpsOutreachDismissalKey(BANNER.id),
    );
    expect(
      queryByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('tracks dismissal before hiding the campaign', () => {
    const { getByTestId } = renderBanner();

    fireEvent.press(getByTestId(PerpsOutreachBannerSelectorsIDs.CLOSE_BUTTON));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_OUTREACH_BANNER_INTERACTION.DISMISSED,
        [PERPS_EVENT_PROPERTY.LOCATION]: 'perps_home',
        campaign_id: BANNER.id,
      },
    );
  });

  it('parses every campaign tap without duplicate suppression', () => {
    const { getByTestId } = renderBanner();
    const content = getByTestId(PerpsOutreachBannerSelectorsIDs.CONTENT);

    fireEvent.press(content);
    fireEvent.press(content);

    expect(mockParseDeeplink).toHaveBeenCalledTimes(2);
    expect(mockParseDeeplink).toHaveBeenNthCalledWith(2, BANNER.linkUrl, {
      origin: AppConstants.DEEPLINKS.ORIGIN_PERPS_OUTREACH,
    });
  });

  it('tracks a tap before routing the campaign link', () => {
    const { getByTestId } = renderBanner();

    fireEvent.press(getByTestId(PerpsOutreachBannerSelectorsIDs.CONTENT));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_OUTREACH_BANNER_INTERACTION.TAPPED,
        [PERPS_EVENT_PROPERTY.LOCATION]: 'perps_home',
        campaign_id: BANNER.id,
      },
    );
  });

  it('does not dismiss the campaign when the banner body is tapped', () => {
    const { getByTestId, store } = renderBanner();

    fireEvent.press(getByTestId(PerpsOutreachBannerSelectorsIDs.CONTENT));

    // Dismissal is exclusive to the close button; a body tap must leave the
    // campaign visible for the user to come back to.
    expect(store.getState().banners.dismissedBanners).not.toContain(
      getPerpsOutreachDismissalKey(BANNER.id),
    );
    expect(
      getByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).toBeOnTheScreen();
  });

  it('stays inert when the campaign has no linkUrl', () => {
    mockUsePerpsOutreachBanner.mockReturnValue({
      data: { ...BANNER, linkUrl: null },
    } as ReturnType<typeof usePerpsOutreachBanner>);

    const { getByTestId } = renderBanner();

    fireEvent.press(getByTestId(PerpsOutreachBannerSelectorsIDs.CONTENT));

    expect(mockParseDeeplink).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_OUTREACH_BANNER_INTERACTION.TAPPED,
      }),
    );
  });

  it('shows a new campaign after a previous campaign was dismissed', () => {
    const { getByTestId } = renderBanner([
      getPerpsOutreachDismissalKey('previous-campaign'),
    ]);

    expect(
      getByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).toBeOnTheScreen();
  });

  it('collapses the image slot when the campaign image fails to load', () => {
    const { getByTestId, queryByTestId, getByText } = renderBanner();

    fireEvent(getByTestId(PerpsOutreachBannerSelectorsIDs.IMAGE), 'error');

    expect(
      queryByTestId(PerpsOutreachBannerSelectorsIDs.IMAGE),
    ).not.toBeOnTheScreen();
    expect(getByText(BANNER.title)).toBeOnTheScreen();
  });

  it('collapses the image slot when the campaign has no image', () => {
    mockUsePerpsOutreachBanner.mockReturnValue({
      data: { ...BANNER, imageUrl: '' },
    } as ReturnType<typeof usePerpsOutreachBanner>);

    const { queryByTestId, getByText } = renderBanner();

    expect(
      queryByTestId(PerpsOutreachBannerSelectorsIDs.IMAGE),
    ).not.toBeOnTheScreen();
    expect(getByText(BANNER.title)).toBeOnTheScreen();
  });

  it('exposes an accessible close action', () => {
    const { getByTestId } = renderBanner();

    expect(
      getByTestId(PerpsOutreachBannerSelectorsIDs.CLOSE_BUTTON),
    ).toHaveProp('accessibilityLabel', 'Close');
  });

  it('slides the campaign down from the top of the screen', () => {
    const { getByTestId } = renderBanner();

    expect(SlideInUp.duration).toHaveBeenCalledWith(AnimationDuration.Promptly);
    expect(
      getByTestId(PerpsOutreachBannerSelectorsIDs.BANNER).props.entering,
    ).toBe('slide-in-up-transition');
  });

  it('covers the status bar area when it sits above a surface header', () => {
    const { getByTestId } = renderBanner([], { includesTopInset: true });

    expect(
      flattenStyle(getByTestId(PerpsOutreachBannerSelectorsIDs.BANNER)),
    ).toMatchObject({ paddingTop: TOP_INSET });
  });

  it('leaves the status bar area to the surface by default', () => {
    const { getByTestId } = renderBanner();

    expect(
      flattenStyle(getByTestId(PerpsOutreachBannerSelectorsIDs.BANNER)),
    ).not.toHaveProperty('paddingTop');
  });
});
