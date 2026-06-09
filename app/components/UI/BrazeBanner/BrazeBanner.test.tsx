import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import Braze from '@braze/react-native-sdk';
import BrazeBanner from './BrazeBanner';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';
import { SKELETON_TIMEOUT_MS } from './BrazeBanner.constants';

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
    logCustomEvent: jest.fn(),
    requestImmediateDataFlush: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock: core/Braze
// ---------------------------------------------------------------------------
const mockGetBannerForPlacement = jest.fn().mockResolvedValue(null);
const mockLogBrazeBannerImpression = jest.fn();
const mockLogBrazeBannerClick = jest.fn();

jest.mock('../../../core/Braze', () => ({
  getBannerForPlacement: (...args: unknown[]) =>
    mockGetBannerForPlacement(...args),
  refreshBrazeBanners: jest.fn(),
  dismissBrazeBanner: jest.fn(),
  logBrazeBannerImpression: (...args: unknown[]) =>
    mockLogBrazeBannerImpression(...args),
  logBrazeBannerClick: (...args: unknown[]) => mockLogBrazeBannerClick(...args),
}));

// ---------------------------------------------------------------------------
// Mock: SharedDeeplinkManager
// ---------------------------------------------------------------------------
const mockParse = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../core/DeeplinkManager/DeeplinkManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({ parse: mockParse }),
  },
}));

// ---------------------------------------------------------------------------
// Mock: isAllowedBrazeDeeplink — default to true; individual tests can override
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
  const mockReact = jest.requireActual('react');
  const { View: mockRNView } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...rest
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => mockReact.createElement(mockRNView, { testID, ...rest }, children),
  };
});

// ---------------------------------------------------------------------------
// Mock: BrazeBannerCard — stub that renders only the dismiss button.
// The outer CONTAINER testID lives on BrazeBanner's own Box; no duplicate here.
// ---------------------------------------------------------------------------
jest.mock('./BrazeBannerCard', () => {
  const mockReact = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  const { BRAZE_BANNER_TEST_IDS: IDS } = jest.requireActual(
    './BrazeBanner.testIds',
  );
  return {
    __esModule: true,
    default: ({ onDismiss }: { onDismiss: () => void }) =>
      mockReact.createElement(Pressable, {
        testID: IDS.DISMISS_BUTTON,
        onPress: onDismiss,
      }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRawProperties(props: {
  bannerName?: string;
  dismissable?: boolean;
  deeplink?: string;
  body?: string;
}): Record<string, { type: string; value: unknown }> {
  const result: Record<string, { type: string; value: unknown }> = {
    // body is always set so the banner transitions to visible
    body: { type: 'string', value: props.body ?? 'Default body text' },
  };
  if (props.bannerName !== undefined)
    result.campaign_name = { type: 'string', value: props.bannerName };
  if (props.dismissable !== undefined)
    result.dismissable = { type: 'boolean', value: props.dismissable };
  if (props.deeplink !== undefined)
    result.deeplink = { type: 'string', value: props.deeplink };
  return result;
}

function makeBanner(
  overrides: Partial<{
    trackingId: string;
    placementId: string;
    bannerName: string;
    dismissable: boolean;
    deeplink: string;
    body: string;
  }> = {},
) {
  return {
    trackingId: overrides.trackingId ?? 'tracking-abc',
    placementId: overrides.placementId ?? TEST_PLACEMENT_ID,
    isControl: false,
    isTestSend: false,
    expiresAt: -1,
    properties: makeRawProperties({
      bannerName: overrides.bannerName,
      dismissable: overrides.dismissable,
      deeplink: overrides.deeplink,
      body: overrides.body,
    }),
  };
}

const fireBannerEvent = (banners: object[]) => {
  act(() => {
    capturedBannerListener?.({ banners });
  });
};

type BannerState = 'visible' | 'empty';

/**
 * Asserts the complete set of structural test IDs for a given banner state:
 * - `visible`  → CONTAINER + PRESSABLE + DISMISS_BUTTON present
 * - `empty`    → all absent (component returns null; covers loading + empty + dismissed)
 */
function assertBannerState(
  queryByTestId: (id: string) => unknown,
  state: BannerState,
) {
  const present = (id: string) => expect(queryByTestId(id)).toBeTruthy();
  const absent = (id: string) => expect(queryByTestId(id)).toBeNull();

  if (state === 'visible') {
    present(BRAZE_BANNER_TEST_IDS.CONTAINER);
    present(BRAZE_BANNER_TEST_IDS.PRESSABLE);
    present(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON);
  } else {
    absent(BRAZE_BANNER_TEST_IDS.CONTAINER);
    absent(BRAZE_BANNER_TEST_IDS.PRESSABLE);
    absent(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON);
  }
}

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
    mockIsAllowedBrazeDeeplink.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while waiting for the first banner event', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    assertBannerState(queryByTestId, 'empty');
  });

  it('shows the banner card and dismiss button when a banner event arrives', async () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);

    assertBannerState(queryByTestId, 'visible');
  });

  it('renders nothing after the skeleton timeout when no banner arrives', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    act(() => {
      jest.advanceTimersByTime(SKELETON_TIMEOUT_MS);
    });

    assertBannerState(queryByTestId, 'empty');
  });

  it('renders nothing when bannerCardsUpdated arrives with no banner for the placement', () => {
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([]);

    // No match → handleBanner not called → returns null (loading now returns null)
    assertBannerState(queryByTestId, 'empty');
  });

  it('renders nothing when incoming banner bannerName matches lastDismissedBrazeBanner', () => {
    mockLastDismissed = 'campaign-xyz';
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner({ bannerName: 'campaign-xyz' })]);

    // Dismissed banner is skipped; hook stays in loading which now returns null
    assertBannerState(queryByTestId, 'empty');
  });

  it('renders normally when lastDismissedBrazeBanner does not match incoming banner', () => {
    mockLastDismissed = 'old-campaign';
    const { queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner({ bannerName: 'new-campaign' })]);

    assertBannerState(queryByTestId, 'visible');
  });

  it('renders null immediately on dismiss with no skeleton shown', () => {
    const { getByTestId, queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);
    expect(queryByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON)).toBeTruthy();

    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    assertBannerState(queryByTestId, 'empty');
  });

  it('dispatches setLastDismissedBrazeBanner on dismiss when banner_name and dismissable:true are set', () => {
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([
      makeBanner({ bannerName: 'campaign-xyz', dismissable: true }),
    ]);
    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: 'campaign-xyz' }),
    );
  });

  it('does not dispatch when banner has no bannerName', () => {
    const { getByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);
    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('ignores further bannerCardsUpdated events after dismiss', () => {
    const { getByTestId, queryByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    fireBannerEvent([makeBanner()]);
    fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON));

    fireBannerEvent([makeBanner({ trackingId: 'new-banner' })]);

    assertBannerState(queryByTestId, 'empty');
  });

  it('uses warm-cache banner from getBannerForPlacement on mount', async () => {
    mockGetBannerForPlacement.mockResolvedValue(makeBanner());

    const { findByTestId } = render(
      <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
    );

    expect(await findByTestId(BRAZE_BANNER_TEST_IDS.PRESSABLE)).toBeTruthy();
  });

  it('cancels the skeleton timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = render(<BrazeBanner placementId={TEST_PLACEMENT_ID} />);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('calls logBrazeBannerImpression when the banner becomes visible', () => {
    render(<BrazeBanner placementId={TEST_PLACEMENT_ID} />);

    fireBannerEvent([makeBanner({ bannerName: 'campaign-abc' })]);

    expect(mockLogBrazeBannerImpression).toHaveBeenCalledWith(
      TEST_PLACEMENT_ID,
      { campaign_name: 'campaign-abc' },
    );
    expect(mockLogBrazeBannerImpression).toHaveBeenCalledTimes(1);
  });

  it('calls logBrazeBannerImpression with null properties when bannerName is absent', () => {
    render(<BrazeBanner placementId={TEST_PLACEMENT_ID} />);

    fireBannerEvent([makeBanner()]);

    expect(mockLogBrazeBannerImpression).toHaveBeenCalledWith(
      TEST_PLACEMENT_ID,
      null,
    );
  });

  it('does not log impression while in loading state', () => {
    render(<BrazeBanner placementId={TEST_PLACEMENT_ID} />);

    expect(mockLogBrazeBannerImpression).not.toHaveBeenCalled();
  });

  describe('banner tap', () => {
    it('calls logBrazeBannerClick and SharedDeeplinkManager.parse when banner has a deeplink', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner({ deeplink: 'metamask://portfolio' })]);
      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.PRESSABLE));

      expect(mockLogBrazeBannerClick).toHaveBeenCalledWith(TEST_PLACEMENT_ID);
      expect(mockParse).toHaveBeenCalledWith('metamask://portfolio', {
        origin: 'braze',
      });
    });

    it('does nothing when banner has no deeplink property', () => {
      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([makeBanner()]);
      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.PRESSABLE));

      expect(mockParse).not.toHaveBeenCalled();
      expect(mockLogBrazeBannerClick).not.toHaveBeenCalled();
    });

    it('does not call SharedDeeplinkManager.parse or logBrazeBannerClick when deeplink is rejected by the allowlist', () => {
      mockIsAllowedBrazeDeeplink.mockReturnValueOnce(false);

      const { getByTestId } = render(
        <BrazeBanner placementId={TEST_PLACEMENT_ID} />,
      );

      fireBannerEvent([
        makeBanner({ deeplink: 'https://evil.com/steal-funds' }),
      ]);
      fireEvent.press(getByTestId(BRAZE_BANNER_TEST_IDS.PRESSABLE));

      expect(mockParse).not.toHaveBeenCalled();
      expect(mockLogBrazeBannerClick).not.toHaveBeenCalled();
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
});
