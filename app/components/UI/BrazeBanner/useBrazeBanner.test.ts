import { renderHook, act } from '@testing-library/react-hooks';
import Braze from '@braze/react-native-sdk';
import { useBrazeBanner } from './useBrazeBanner';

const TEST_PLACEMENT_ID = 'placement-1';
const SKELETON_TIMEOUT_MS = 5000;

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
const mockDismissBrazeBanner = jest.fn();

jest.mock('../../../core/Braze', () => ({
  getBannerForPlacement: (...args: unknown[]) =>
    mockGetBannerForPlacement(...args),
  refreshBrazeBanners: jest.fn(),
  dismissBrazeBanner: (...args: unknown[]) => mockDismissBrazeBanner(...args),
}));

// ---------------------------------------------------------------------------
// Mock: react-redux
// ---------------------------------------------------------------------------
const mockDispatch = jest.fn();
let mockLastDismissed: string | null = null;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({ banners: { lastDismissedBrazeBanner: mockLastDismissed } }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a raw Braze properties bag in the flat SDK format:
 * `{ [key]: { type, value } }`.
 *
 * Keys use the snake_case names the Braze dashboard assigns — the same names
 * the hook reads via `getRawStringProp(banner, PROP_*constants)`.
 */
function makeRawProperties(props: {
  bannerId?: string;
  dismissable?: boolean;
  deeplink?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
}): Record<string, { type: string; value: unknown }> {
  const result: Record<string, { type: string; value: unknown }> = {};
  if (props.bannerId !== undefined)
    result.banner_id = { type: 'string', value: props.bannerId };
  if (props.dismissable !== undefined)
    result.dismissable = { type: 'boolean', value: props.dismissable };
  if (props.deeplink !== undefined)
    result.deeplink = { type: 'string', value: props.deeplink };
  if (props.title !== undefined)
    result.title = { type: 'string', value: props.title };
  if (props.body !== undefined)
    result.body = { type: 'string', value: props.body };
  if (props.imageUrl !== undefined)
    result.image_url = { type: 'string', value: props.imageUrl };
  if (props.ctaLabel !== undefined)
    result.cta_label = { type: 'string', value: props.ctaLabel };
  return result;
}

function makeBanner(
  overrides: Partial<{
    trackingId: string;
    placementId: string;
    bannerId: string;
    dismissable: boolean;
    deeplink: string;
    title: string;
    body: string;
    imageUrl: string;
    ctaLabel: string;
  }> = {},
) {
  return {
    trackingId: overrides.trackingId ?? 'tracking-abc',
    placementId: overrides.placementId ?? TEST_PLACEMENT_ID,
    isControl: false,
    isTestSend: false,
    expiresAt: -1,
    properties: makeRawProperties({
      bannerId: overrides.bannerId,
      dismissable: overrides.dismissable,
      deeplink: overrides.deeplink,
      title: overrides.title,
      body: overrides.body ?? 'Default body',
      imageUrl: overrides.imageUrl,
      ctaLabel: overrides.ctaLabel,
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
describe('useBrazeBanner', () => {
  beforeEach(() => {
    capturedBannerListener = undefined;
    mockLastDismissed = null;
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetBannerForPlacement.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
    expect(result.current.status).toBe('loading');
    expect(result.current.banner).toBeNull();
  });

  it('transitions to visible when a valid banner event arrives', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner()]);

    expect(result.current.status).toBe('visible');
    expect(result.current.banner).not.toBeNull();
  });

  it('stays in loading when banner event arrives with no body (waits for meaningful banner)', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    // Listener's find() filters out body-less banners; handleBanner is never
    // called, so the hook waits for the next event or the timeout.
    const bannerWithoutBody = {
      trackingId: 'tracking-abc',
      placementId: TEST_PLACEMENT_ID,
      isControl: false,
      isTestSend: false,
      expiresAt: -1,
      properties: {},
    };
    fireBannerEvent([bannerWithoutBody]);

    expect(result.current.status).toBe('loading');
  });

  it('transitions to empty when skeleton timeout elapses with no banner', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    act(() => {
      jest.advanceTimersByTime(SKELETON_TIMEOUT_MS);
    });

    expect(result.current.status).toBe('empty');
  });

  it('stays in loading when event arrives with no matching banner (timeout handles empty path)', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    // No match found → handleBanner not called → status stays loading.
    // The skeleton timeout is responsible for transitioning to empty.
    fireBannerEvent([]);

    expect(result.current.status).toBe('loading');
  });

  it('stays visible after timeout fires when a banner arrived first', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner()]);

    act(() => {
      jest.advanceTimersByTime(SKELETON_TIMEOUT_MS);
    });

    expect(result.current.status).toBe('visible');
  });

  it('clears the skeleton timeout when a banner arrives', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner()]);

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('stays in loading when event banner_id matches lastDismissedBrazeBanner', () => {
    mockLastDismissed = 'campaign-xyz';
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner({ bannerId: 'campaign-xyz' })]);

    expect(result.current.status).toBe('loading');
  });

  it('shows banner when lastDismissedBrazeBanner does not match', () => {
    mockLastDismissed = 'old-campaign';
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner({ bannerId: 'new-campaign' })]);

    expect(result.current.status).toBe('visible');
  });

  it('ignores duplicate events with the same trackingId', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
    const banner = makeBanner();

    fireBannerEvent([banner]);
    expect(result.current.status).toBe('visible');

    fireBannerEvent([banner]);
    expect(result.current.status).toBe('visible');
  });

  it('transitions to dismissed when dismiss() is called', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner()]);
    expect(result.current.status).toBe('visible');

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.status).toBe('dismissed');
  });

  describe('dismiss — persistence', () => {
    it('dispatches setLastDismissedBrazeBanner when both banner_id and dismissable:true are set', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([
        makeBanner({ bannerId: 'campaign-xyz', dismissable: true }),
      ]);

      act(() => {
        result.current.dismiss();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: 'campaign-xyz' }),
      );
    });

    it('does not dispatch when banner has banner_id but dismissable is false', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([
        makeBanner({ bannerId: 'campaign-xyz', dismissable: false }),
      ]);

      act(() => {
        result.current.dismiss();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch when banner has banner_id but dismissable is absent', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([makeBanner({ bannerId: 'campaign-xyz' })]);

      act(() => {
        result.current.dismiss();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch when banner has no banner_id', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([makeBanner()]);

      act(() => {
        result.current.dismiss();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('calls dismissBrazeBanner when both banner_id and dismissable:true are set', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([
        makeBanner({ bannerId: 'campaign-xyz', dismissable: true }),
      ]);

      act(() => {
        result.current.dismiss();
      });

      expect(mockDismissBrazeBanner).toHaveBeenCalledWith('campaign-xyz');
    });

    it('does not call dismissBrazeBanner when dismissable is absent', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([makeBanner({ bannerId: 'campaign-xyz' })]);

      act(() => {
        result.current.dismiss();
      });

      expect(mockDismissBrazeBanner).not.toHaveBeenCalled();
    });
  });

  it('ignores subsequent events after dismiss', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner()]);
    act(() => {
      result.current.dismiss();
    });

    fireBannerEvent([makeBanner({ trackingId: 'new-tracking' })]);

    expect(result.current.status).toBe('dismissed');
  });

  it('transitions to visible from warm-cache probe on mount', async () => {
    mockGetBannerForPlacement.mockResolvedValue(makeBanner());

    const { result, waitForNextUpdate } = renderHook(() =>
      useBrazeBanner(TEST_PLACEMENT_ID),
    );

    await waitForNextUpdate();

    expect(result.current.status).toBe('visible');
  });

  it('removes the listener subscription on unmount', () => {
    const mockRemove = jest.fn();
    (Braze.addListener as jest.Mock).mockReturnValueOnce({
      remove: mockRemove,
    });

    const { unmount } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // lastDismissedBrazeBanner clearing
  // ---------------------------------------------------------------------------
  describe('lastDismissedBrazeBanner clearing', () => {
    it('dispatches setLastDismissedBrazeBanner(null) when a new banner replaces a previously dismissed one', () => {
      mockLastDismissed = 'old-campaign';
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([makeBanner({ bannerId: 'new-campaign' })]);

      expect(result.current.status).toBe('visible');
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: null }),
      );
    });

    it('does not dispatch null when lastDismissedBrazeBanner is already null', () => {
      mockLastDismissed = null;
      renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([makeBanner({ bannerId: 'new-campaign' })]);

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('dispatches null when a banner with no banner_id arrives and lastDismissed was set', () => {
      mockLastDismissed = 'old-campaign';
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      // Banner without bannerId passes the dismissed filter (null !== 'old-campaign')
      fireBannerEvent([makeBanner()]);

      expect(result.current.status).toBe('visible');
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: null }),
      );
    });

    it('dispatches null only once across multiple events for the same new banner', () => {
      mockLastDismissed = 'old-campaign';
      renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      fireBannerEvent([makeBanner({ bannerId: 'new-campaign' })]);

      // A second event with a different trackingId carrying the same campaign
      fireBannerEvent([
        makeBanner({ trackingId: 'tracking-2', bannerId: 'new-campaign' }),
      ]);

      const nullPayloadCalls = mockDispatch.mock.calls.filter(
        ([action]) => action?.payload === null,
      );
      expect(nullPayloadCalls).toHaveLength(1);
    });

    it('does not dispatch null when the incoming banner is still the dismissed one', () => {
      mockLastDismissed = 'campaign-xyz';
      renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      // This event is skipped because banner_id matches lastDismissed
      fireBannerEvent([makeBanner({ bannerId: 'campaign-xyz' })]);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Content properties
  // ---------------------------------------------------------------------------
  describe('content properties', () => {
    it('returns null body and title when no banner is loaded', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      expect(result.current.body).toBeNull();
      expect(result.current.title).toBeNull();
    });

    it('returns body from banner property', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner({ body: 'Hello world' })]);
      expect(result.current.body).toBe('Hello world');
    });

    it('returns null title when property is absent', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner()]);
      expect(result.current.title).toBeNull();
    });

    it('returns title from banner property', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner({ title: 'Banner title' })]);
      expect(result.current.title).toBe('Banner title');
    });

    it('returns null imageUrl when property is absent', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner()]);
      expect(result.current.imageUrl).toBeNull();
    });

    it('returns imageUrl from banner property when type is string', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([
        makeBanner({ imageUrl: 'https://example.com/img.png' }),
      ]);
      expect(result.current.imageUrl).toBe('https://example.com/img.png');
    });

    it('returns imageUrl from banner property when type is image', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      const bannerWithImageType = makeBanner();
      (
        bannerWithImageType.properties as Record<
          string,
          { type: string; value: unknown }
        >
      ).image_url = { type: 'image', value: 'https://example.com/img.png' };
      fireBannerEvent([bannerWithImageType]);
      expect(result.current.imageUrl).toBe('https://example.com/img.png');
    });

    it('returns null ctaLabel when property is absent', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner()]);
      expect(result.current.ctaLabel).toBeNull();
    });

    it('returns ctaLabel from banner property', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner({ ctaLabel: 'Enable' })]);
      expect(result.current.ctaLabel).toBe('Enable');
    });

    it('returns null bannerId when property is absent', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner()]);
      expect(result.current.bannerId).toBeNull();
    });

    it('returns bannerId from banner property', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner({ bannerId: 'campaign-abc' })]);
      expect(result.current.bannerId).toBe('campaign-abc');
    });
  });

  describe('deeplink property', () => {
    it('returns null deeplink when property is absent', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner()]);
      expect(result.current.deeplink).toBeNull();
    });

    it('returns deeplink from banner property', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner({ deeplink: 'metamask://portfolio' })]);
      expect(result.current.deeplink).toBe('metamask://portfolio');
    });

    it('returns null deeplink when no banner is loaded', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      expect(result.current.deeplink).toBeNull();
    });
  });
});
