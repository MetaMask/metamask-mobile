import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import Braze from '@braze/react-native-sdk';
import BrazeBanner from './BrazeBanner';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';

const TEST_PLACEMENT_ID = 'test-placement-1';

// ---------------------------------------------------------------------------
// Mock: @braze/react-native-sdk
// ---------------------------------------------------------------------------
let capturedBannerListener:
  | ((event: { banners: object[] }) => void)
  | undefined;

jest.mock('@braze/react-native-sdk', () => ({
  __esModule: true,
  default: {
    getBanner: jest.fn().mockResolvedValue(null),
    addListener: jest
      .fn()
      .mockImplementation(
        (_event: string, cb: (event: { banners: object[] }) => void) => {
          capturedBannerListener = cb;
          return { remove: jest.fn() };
        },
      ),
    logBannerClick: jest.fn(),
    logBannerImpression: jest.fn(),
    requestImmediateDataFlush: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock: core/Braze
// ---------------------------------------------------------------------------
const mockGetBannerForPlacement = jest.fn().mockResolvedValue(null);
jest.mock('../../../core/Braze', () => ({
  getBannerForPlacement: (...args: unknown[]) =>
    mockGetBannerForPlacement(...args),
  refreshBrazeBanners: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: deeplink handler
// ---------------------------------------------------------------------------
const mockHandleDeeplink = jest.fn();
jest.mock(
  '../../../core/DeeplinkManager/handlers/legacy/handleDeeplink',
  () => ({
    handleDeeplink: (...args: unknown[]) => mockHandleDeeplink(...args),
  }),
);

// ---------------------------------------------------------------------------
// Mock: isAllowedBrazeDeeplink — default to true so existing tests are
// unaffected; individual tests override via mockReturnValueOnce.
// ---------------------------------------------------------------------------
const mockIsAllowedBrazeDeeplink = jest.fn().mockReturnValue(true);
jest.mock('./isAllowedBrazeDeeplink', () => ({
  isAllowedBrazeDeeplink: (...args: unknown[]) =>
    mockIsAllowedBrazeDeeplink(...args),
}));

// ---------------------------------------------------------------------------
// Mock: Redux (react-redux)
// ---------------------------------------------------------------------------
const mockDispatch = jest.fn();
let mockLastDismissed: string | null = null;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({ banners: { lastDismissedBrazeBanner: mockLastDismissed } }),
}));

// ---------------------------------------------------------------------------
// Mock: design-system
// ---------------------------------------------------------------------------
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: (string | boolean | undefined)[]) =>
      args.filter(Boolean).join(' '),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const mockReact = require('react');
  const {
    View: mockRNView,
    Pressable: mockPressable,
  } = require('react-native');
  return {
    Box: mockRNView,
    Skeleton: ({
      testID,
    }: {
      testID?: string;
      height?: number;
      twClassName?: string;
    }) => mockReact.createElement(mockRNView, { testID }),
    ButtonIcon: ({
      onPress,
      testID,
    }: {
      onPress: () => void;
      testID?: string;
    }) => mockReact.createElement(mockPressable, { onPress, testID }),
    ButtonIconSize: { Sm: 'sm' },
    IconName: { Close: 'close' },
    IconColor: { IconDefault: 'icon-default' },
  };
});

// ---------------------------------------------------------------------------
// Mock: BrazeBannerWebView — simple static placeholder
// ---------------------------------------------------------------------------
jest.mock('./BrazeBannerWebView', () => {
  const mockReact = require('react');
  const { View: mockView } = require('react-native');
  return {
    __esModule: true,
    default: () =>
      mockReact.createElement(mockView, {
        testID: BRAZE_BANNER_TEST_IDS.WEBVIEW,
      }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRawProperties(props: {
  dismissId?: string;
  deeplink?: string;
  height?: number;
}) {
  const inner: Record<string, { type: string; value: unknown }> = {};
  if (props.dismissId !== undefined)
    inner.dismiss_id = { type: 'string', value: props.dismissId };
  if (props.deeplink !== undefined)
    inner.deeplink = { type: 'string', value: props.deeplink };
  if (props.height !== undefined)
    inner.height = { type: 'number', value: props.height };
  return Object.keys(inner).length > 0 ? { properties: inner } : {};
}

function makeBanner(
  overrides: Partial<{
    trackingId: string;
    placementId: string;
    html: string;
    dismissId: string;
    deeplink: string;
    height: number;
  }> = {},
) {
  return {
    trackingId: overrides.trackingId ?? 'tracking-abc',
    placementId: overrides.placementId ?? TEST_PLACEMENT_ID,
    html: overrides.html ?? '<div>Hello</div>',
    isControl: false,
    isTestSend: false,
    expiresAt: -1,
    properties: makeRawProperties({
      dismissId: overrides.dismissId,
      deeplink: overrides.deeplink,
      height: overrides.height,
    }),
  };
}

const fireBannerEvent = (banners: object[]) => {
  act(() => {
    capturedBannerListener?.({ banners });
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BrazeBanner', () => {
  beforeEach(() => {
    capturedBannerListener = undefined;
    mockLastDismissed = null;
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetBannerForPlacement.mockResolvedValue(null);
    (Braze.getBanner as jest.Mock).mockResolvedValue(null);
    // Allow all deeplinks by default so existing tests are unaffected
    mockIsAllowedBrazeDeeplink.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders skeleton while waiting for the first banner event', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.SKELETON)).toBeTruthy();
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON)).toBeNull();
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.WEBVIEW)).toBeNull();
  });

  it('shows the WebView and dismiss button when a banner event arrives', async () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.SKELETON)).toBeNull();
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.WEBVIEW)).toBeTruthy();
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON)).toBeTruthy();
  });

  it('renders nothing after the skeleton timeout when no banner arrives', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.SKELETON)).toBeNull();
  });

  it('renders nothing when bannerCardsUpdated contains no banner for the placement', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([]);

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('stays in skeleton when incoming banner key matches lastDismissedBrazeBanner', () => {
    mockLastDismissed = 'tracking-abc';
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner({ trackingId: 'tracking-abc' })]);

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.SKELETON)).toBeTruthy();
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.WEBVIEW)).toBeNull();
  });

  it('respects custom dismiss_id property for dismiss key matching', () => {
    mockLastDismissed = 'campaign-xyz';
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([
      makeBanner({
        trackingId: 'different-tracking',
        dismissId: 'campaign-xyz',
      }),
    ]);

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.SKELETON)).toBeTruthy();
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.WEBVIEW)).toBeNull();
  });

  it('renders normally when lastDismissedBrazeBanner does not match incoming banner', () => {
    mockLastDismissed = 'old-campaign';
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner({ trackingId: 'new-campaign' })]);

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.WEBVIEW)).toBeTruthy();
  });

  it('renders null immediately on dismiss with no skeleton shown', () => {
    const { getByTestId, queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON)).toBeTruthy();

    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.SKELETON)).toBeNull();
  });

  it('dispatches setLastDismissedBrazeBanner on dismiss', () => {
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner({ trackingId: 'tracking-abc' })]);
    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: 'tracking-abc' }),
    );
  });

  it('uses dismiss_id property as dispatch payload when available', () => {
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([
      makeBanner({ trackingId: 'tracking-abc', dismissId: 'campaign-xyz' }),
    ]);
    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: 'campaign-xyz' }),
    );
  });

  it('calls logBannerClick and requestImmediateDataFlush on dismiss', () => {
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);
    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    expect(Braze.logBannerClick).toHaveBeenCalledWith(TEST_PLACEMENT_ID, null);
    expect(Braze.requestImmediateDataFlush).toHaveBeenCalledTimes(1);
  });

  it('does NOT call refreshBrazeBanners on dismiss', () => {
    const { refreshBrazeBanners } = require('../../../core/Braze');
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);
    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    expect(refreshBrazeBanners).not.toHaveBeenCalled();
  });

  it('ignores further bannerCardsUpdated events after dismiss', () => {
    const { getByTestId, queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);
    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    fireBannerEvent([makeBanner({ trackingId: 'new-banner' })]);

    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('uses warm-cache banner from getBannerForPlacement on mount', async () => {
    mockGetBannerForPlacement.mockResolvedValue(makeBanner());

    const { findByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    expect(await findByTestId(BRAZE_BANNER_TEST_IDS.WEBVIEW)).toBeTruthy();
  });

  it('cancels the skeleton timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = render(<BrazeBanner placementId={TEST_PLACEMENT_ID} />);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('logs a banner impression when the banner becomes visible', () => {
    render(<BrazeBanner placementId={TEST_PLACEMENT_ID} />);

    fireBannerEvent([makeBanner()]);

    expect(Braze.logBannerImpression).toHaveBeenCalledWith(TEST_PLACEMENT_ID);
    expect(Braze.logBannerImpression).toHaveBeenCalledTimes(1);
  });

  it('does not log impression while in loading state', () => {
    render(<BrazeBanner placementId={TEST_PLACEMENT_ID} />);

    expect(Braze.logBannerImpression).not.toHaveBeenCalled();
  });

  describe('banner tap', () => {
    it('calls handleDeeplink and logBannerClick when banner has a deeplink', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner({ deeplink: 'metamask://portfolio' })]);
      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.PRESSABLE));

      expect(Braze.logBannerClick).toHaveBeenCalledWith(
        TEST_PLACEMENT_ID,
        null,
      );
      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        uri: 'metamask://portfolio',
        source: 'braze',
      });
    });

    it('does nothing when banner has no deeplink property', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner()]);
      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.PRESSABLE));

      expect(mockHandleDeeplink).not.toHaveBeenCalled();
      expect(Braze.logBannerClick).not.toHaveBeenCalled();
    });

    it('does not call handleDeeplink or logBannerClick when deeplink is rejected by the allowlist', () => {
      mockIsAllowedBrazeDeeplink.mockReturnValueOnce(false);

      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([
        makeBanner({ deeplink: 'https://evil.com/steal-funds' }),
      ]);
      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.PRESSABLE));

      expect(mockHandleDeeplink).not.toHaveBeenCalled();
      expect(Braze.logBannerClick).not.toHaveBeenCalled();
    });

    it('passes the deeplink URI to isAllowedBrazeDeeplink before routing', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner({ deeplink: 'metamask://home' })]);
      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.PRESSABLE));

      expect(mockIsAllowedBrazeDeeplink).toHaveBeenCalledWith(
        'metamask://home',
      );
    });
  });

  describe('height clamping', () => {
    it('uses DEFAULT_BANNER_HEIGHT (120) when no height property is set', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner()]);

      const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ height: 120 })]),
      );
    });

    it('clamps a height below the minimum (60) up to 60', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner({ height: 10 })]);

      const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ height: 60 })]),
      );
    });

    it('clamps a height above the maximum (240) down to 240', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner({ height: 5000 })]);

      const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ height: 240 })]),
      );
    });

    it('uses an in-range height value as-is', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner({ height: 150 })]);

      const container = getByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER);
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ height: 150 })]),
      );
    });
  });
});
