import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import { saveAttribution } from '../../core/redux/slices/attribution';
import {
  persistAttributionFromPendingDeeplink,
  persistUtmAttributes,
} from './persistAttributionFromPendingDeeplink';

jest.mock('../../core/redux/slices/attributionFromSources', () => ({
  attributionPayloadFromDeeplink: jest.fn(),
}));

import { attributionPayloadFromDeeplink } from '../../core/redux/slices/attributionFromSources';

const mockAttributionPayloadFromDeeplink =
  attributionPayloadFromDeeplink as jest.MockedFunction<
    typeof attributionPayloadFromDeeplink
  >;

describe('persistUtmAttributes', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches saveAttribution when the deeplink has acquisition params', () => {
    const deeplink =
      'https://link.metamask.io/onboarding?utm_source=e2e&utm_campaign=test';
    const payload = { utm_source: 'e2e', utm_campaign: 'test' };
    mockAttributionPayloadFromDeeplink.mockReturnValue(payload);

    const result = persistUtmAttributes(deeplink, dispatch);

    expect(result).toBe(true);
    expect(mockAttributionPayloadFromDeeplink).toHaveBeenCalledWith(deeplink);
    expect(dispatch).toHaveBeenCalledWith(saveAttribution(payload));
  });

  it('returns false when the deeplink has no attributable params', () => {
    mockAttributionPayloadFromDeeplink.mockReturnValue(null);

    const result = persistUtmAttributes('metamask://connect', dispatch);

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('persistAttributionFromPendingDeeplink', () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    AppStateEventProcessor.pendingDeeplink = null;
    AppStateEventProcessor.currentDeeplink = null;
  });

  it('returns false when no deeplink is pending or current', () => {
    const result = persistAttributionFromPendingDeeplink(dispatch);

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches saveAttribution from pending deeplink when payload exists', () => {
    const deeplink =
      'https://link.metamask.io/home?utm_source=e2e&utm_campaign=test';
    const payload = { utm_source: 'e2e', utm_campaign: 'test' };
    AppStateEventProcessor.pendingDeeplink = deeplink;
    mockAttributionPayloadFromDeeplink.mockReturnValue(payload);

    const result = persistAttributionFromPendingDeeplink(dispatch);

    expect(result).toBe(true);
    expect(mockAttributionPayloadFromDeeplink).toHaveBeenCalledWith(deeplink);
    expect(dispatch).toHaveBeenCalledWith(saveAttribution(payload));
    expect(AppStateEventProcessor.pendingDeeplink).toBe(deeplink);
  });

  it('falls back to current deeplink when pending deeplink is absent', () => {
    const deeplink = 'https://link.metamask.io/home?utm_source=current';
    const payload = { utm_source: 'current' };
    AppStateEventProcessor.currentDeeplink = deeplink;
    mockAttributionPayloadFromDeeplink.mockReturnValue(payload);

    const result = persistAttributionFromPendingDeeplink(dispatch);

    expect(result).toBe(true);
    expect(mockAttributionPayloadFromDeeplink).toHaveBeenCalledWith(deeplink);
    expect(dispatch).toHaveBeenCalledWith(saveAttribution(payload));
  });

  it('returns false when deeplink has no attributable params', () => {
    AppStateEventProcessor.pendingDeeplink = 'metamask://connect';
    mockAttributionPayloadFromDeeplink.mockReturnValue(null);

    const result = persistAttributionFromPendingDeeplink(dispatch);

    expect(result).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
