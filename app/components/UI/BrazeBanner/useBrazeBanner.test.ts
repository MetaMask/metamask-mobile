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
    addListener: jest.fn().mockImplementation(
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
 * Builds a raw Braze properties bag in the format the SDK serialises over
 * the bridge: `{ properties: { [key]: { type, value } } }`.
 *
 * Using raw properties directly avoids the SDK's getStringProperty /
 * getNumberProperty helpers which log console.error for missing keys.
 */
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

  it('transitions to empty when skeleton timeout elapses with no banner', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    act(() => {
      jest.advanceTimersByTime(SKELETON_TIMEOUT_MS);
    });

    expect(result.current.status).toBe('empty');
  });

  it('transitions to empty when event arrives with no matching banner', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([]);

    expect(result.current.status).toBe('empty');
  });

  it('cancels the timeout when a banner arrives before it fires', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner()]);

    act(() => {
      jest.advanceTimersByTime(SKELETON_TIMEOUT_MS);
    });

    expect(result.current.status).toBe('visible');
  });

  it('stays in empty when event banner trackingId matches lastDismissedBrazeBanner', () => {
    mockLastDismissed = 'tracking-abc';
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner({ trackingId: 'tracking-abc' })]);

    expect(result.current.status).toBe('empty');
  });

  it('uses dismiss_id property for dismiss key matching', () => {
    mockLastDismissed = 'campaign-xyz';
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([
      makeBanner({ trackingId: 'any-tracking', dismissId: 'campaign-xyz' }),
    ]);

    expect(result.current.status).toBe('empty');
  });

  it('shows banner when lastDismissedBrazeBanner does not match', () => {
    mockLastDismissed = 'old-campaign';
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner({ trackingId: 'new-campaign' })]);

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

  it('dispatches setLastDismissedBrazeBanner with trackingId on dismiss', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner({ trackingId: 'tracking-abc' })]);

    act(() => {
      result.current.dismiss();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: 'tracking-abc' }),
    );
  });

  it('dispatches setLastDismissedBrazeBanner with dismiss_id when available', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([
      makeBanner({ trackingId: 'tracking-abc', dismissId: 'campaign-xyz' }),
    ]);

    act(() => {
      result.current.dismiss();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: 'campaign-xyz' }),
    );
  });

  it('calls logBannerClick and requestImmediateDataFlush on dismiss', () => {
    const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

    fireBannerEvent([makeBanner()]);

    act(() => {
      result.current.dismiss();
    });

    expect(Braze.logBannerClick).toHaveBeenCalledWith(TEST_PLACEMENT_ID, null);
    expect(Braze.requestImmediateDataFlush).toHaveBeenCalledTimes(1);
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

  describe('HTML size cap', () => {
    it('transitions to empty when banner html exceeds 256 KB', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      // 256 KB + 1 byte — just over the cap
      const oversizedHtml = 'x'.repeat(256 * 1024 + 1);
      fireBannerEvent([makeBanner({ html: oversizedHtml })]);

      expect(result.current.status).toBe('empty');
      expect(result.current.banner).toBeNull();
    });

    it('accepts a banner whose html is exactly 256 KB', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));

      const exactHtml = 'x'.repeat(256 * 1024);
      fireBannerEvent([makeBanner({ html: exactHtml })]);

      expect(result.current.status).toBe('visible');
      expect(result.current.banner).not.toBeNull();
    });
  });

  describe('deeplink and height properties', () => {
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

    it('returns null height when property is absent', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner()]);
      expect(result.current.height).toBeNull();
    });

    it('returns height from banner property', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      fireBannerEvent([makeBanner({ height: 150 })]);
      expect(result.current.height).toBe(150);
    });

    it('returns null deeplink and null height when no banner is loaded', () => {
      const { result } = renderHook(() => useBrazeBanner(TEST_PLACEMENT_ID));
      expect(result.current.deeplink).toBeNull();
      expect(result.current.height).toBeNull();
    });
  });
});
