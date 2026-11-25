import { Platform } from 'react-native';
import {
  AndroidShortlinkGate,
  BRANCH_SHORTLINK_FALLBACK_MS,
} from './androidShortlinkGate';

describe('AndroidShortlinkGate', () => {
  const originalPlatform = Platform.OS;
  const alias = 'https://metamask.app.link/invite-home?ref=5SYFDM';
  const dispatch = jest.fn();
  let gate: AndroidShortlinkGate;

  beforeEach(() => {
    jest.useFakeTimers();
    Platform.OS = 'android';
    dispatch.mockClear();
    gate = new AndroidShortlinkGate(dispatch);
  });

  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = originalPlatform;
  });

  it.each([
    'https://link.metamask.io/invite-home?ref=5SYFDM',
    alias,
    'https://metamask-alternate.app.link/1WkF6GmE40b?amount=100',
    'https://link.metamask.com/invite-perps',
    'https://link.metamask.io/ramp?ref=5SYFDM',
    'https://link.metamask.io/oauth-redirect?code=123',
    'https://link.metamask.io/does-not-exist',
  ])('holds an unrouted Branch URL until the fallback fires: %s', (url) => {
    gate.handleLinkingUrl(url);
    jest.advanceTimersByTime(BRANCH_SHORTLINK_FALLBACK_MS - 1);
    expect(dispatch).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(url);
  });

  it.each([
    'https://link.metamask.io/perps?ref=5SYFDM',
    'https://metamask.app.link/swap?amount=100',
    'https://link.metamask.io/card-kyc-notification',
    'https://link.metamask.io/earn-musd',
    'https://link.metamask.io/',
    'https://example.com/invite-home',
    'metamask://invite-home',
  ])('dispatches the URL immediately without waiting for Branch: %s', (url) => {
    gate.handleLinkingUrl(url);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(url);
  });

  it('dispatches an unrouted Branch URL immediately on iOS', () => {
    Platform.OS = 'ios';
    gate.handleLinkingUrl(alias);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(alias);
  });

  it('cancels a pending fallback when Branch resolves the alias', () => {
    gate.handleLinkingUrl(alias);
    gate.recordBranchResolution(alias);

    jest.advanceTimersByTime(BRANCH_SHORTLINK_FALLBACK_MS);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([alias, `${alias}&_branch_match_id=123`])(
    'drops a late alias after Branch reports the same origin and path: %s',
    (branchUri) => {
      gate.recordBranchResolution(branchUri);
      gate.handleLinkingUrl(alias);

      jest.advanceTimersByTime(BRANCH_SHORTLINK_FALLBACK_MS);
      expect(dispatch).not.toHaveBeenCalled();
    },
  );
});
