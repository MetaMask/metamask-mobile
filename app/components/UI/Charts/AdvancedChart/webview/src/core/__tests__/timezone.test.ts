/**
 * @jest-environment jsdom
 */
import {
  CANONICAL_TO_TV,
  resolveUserTimezone,
  TV_SUPPORTED_TIMEZONES,
} from '../timezone';

const stubIntlTimezone = (zone: string | undefined): void => {
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
    () =>
      ({
        resolvedOptions: () => ({ timeZone: zone }) as ResolvedOptions,
      }) as unknown as Intl.DateTimeFormat,
  );
};

interface ResolvedOptions {
  timeZone: string | undefined;
}

describe('resolveUserTimezone', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a TV-supported zone when Intl reports one directly', () => {
    stubIntlTimezone('Europe/Paris');
    expect(resolveUserTimezone()).toBe('Europe/Paris');
    expect(TV_SUPPORTED_TIMEZONES).toContain('Europe/Paris');
  });

  it('maps canonical aliases to TV legacy names', () => {
    stubIntlTimezone('America/Denver');
    expect(resolveUserTimezone()).toBe(CANONICAL_TO_TV['America/Denver']);
    expect(resolveUserTimezone()).toBe('US/Mountain');
  });

  it('falls back to Etc/UTC when Intl returns an unsupported zone', () => {
    stubIntlTimezone('Africa/Timbuktu'); // not in TV_SUPPORTED_TIMEZONES
    expect(resolveUserTimezone()).toBe('Etc/UTC');
  });

  it('falls back to Etc/UTC when Intl throws', () => {
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('Intl broken');
    });
    expect(resolveUserTimezone()).toBe('Etc/UTC');
  });

  it('falls back to Etc/UTC when Intl reports an empty timezone', () => {
    stubIntlTimezone(undefined);
    expect(resolveUserTimezone()).toBe('Etc/UTC');
  });
});
