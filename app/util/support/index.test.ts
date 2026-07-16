import { getVersion } from 'react-native-device-info';
import Engine from '../../core/Engine';
import Logger from '../Logger';
import Routes from '../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../constants/urls';
import {
  buildSupportUrl,
  getEnrichedSupportUrl,
  navigateToSupportConsent,
  redactCustomerServiceToken,
  SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN,
  SUPPORT_URL_PARAM_VERSION,
} from './index';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getCustomerServiceToken: jest.fn(),
    },
  },
}));

jest.mock('../Logger', () => ({
  log: jest.fn(),
}));

describe('buildSupportUrl', () => {
  beforeEach(() => {
    jest.mocked(getVersion).mockReturnValue('7.1.0');
  });

  it('appends the app version to the default support URL', () => {
    const result = buildSupportUrl();

    const url = new URL(result);
    expect(url.searchParams.get(SUPPORT_URL_PARAM_VERSION)).toBe('7.1.0');
  });

  it('appends the customer service token when provided', () => {
    const result = buildSupportUrl(METAMASK_SUPPORT_URL, 'jwt-token');

    const url = new URL(result);
    expect(url.searchParams.get(SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN)).toBe(
      'jwt-token',
    );
  });

  it('omits the customer service token param when no token is provided', () => {
    const result = buildSupportUrl();

    const url = new URL(result);
    expect(url.searchParams.has(SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN)).toBe(
      false,
    );
  });

  it('never appends a raw profile ID or metametrics ID', () => {
    const result = buildSupportUrl(METAMASK_SUPPORT_URL, 'jwt-token');

    const url = new URL(result);
    expect(url.searchParams.has('metamask_profile_id')).toBe(false);
    expect(url.searchParams.has('metamask_canonical_profile_id')).toBe(false);
    expect(url.searchParams.has('metamask_metametrics_id')).toBe(false);
  });

  it('appends params to a custom base URL preserving existing query params', () => {
    const result = buildSupportUrl('https://support.metamask.io/?priority=vip');

    const url = new URL(result);
    expect(url.searchParams.get('priority')).toBe('vip');
    expect(url.searchParams.get(SUPPORT_URL_PARAM_VERSION)).toBe('7.1.0');
  });
});

describe('redactCustomerServiceToken', () => {
  it('replaces the customer service token value with a placeholder', () => {
    const result = redactCustomerServiceToken(
      'https://support.metamask.io/?metamask_version=7.1.0&customer_service_token=jwt-token',
    );

    const url = new URL(result);
    expect(url.searchParams.get(SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN)).toBe(
      '[REDACTED]',
    );
    expect(url.searchParams.get(SUPPORT_URL_PARAM_VERSION)).toBe('7.1.0');
  });

  it('leaves the URL unchanged when there is no customer service token', () => {
    const input = 'https://support.metamask.io/?metamask_version=7.1.0';

    const result = redactCustomerServiceToken(input);

    expect(result).toBe(input);
  });
});

describe('getEnrichedSupportUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getVersion).mockReturnValue('7.1.0');
  });

  it('returns a URL with the customer service token on success', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');

    const result = await getEnrichedSupportUrl();

    const url = new URL(result);
    expect(url.searchParams.get(SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN)).toBe(
      'jwt-token',
    );
  });

  it('returns the plain support URL when the token request fails', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockRejectedValue(new Error('locked'));

    const result = await getEnrichedSupportUrl();

    const url = new URL(result);
    expect(url.searchParams.has(SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN)).toBe(
      false,
    );
    expect(url.searchParams.get(SUPPORT_URL_PARAM_VERSION)).toBe('7.1.0');
  });

  it('fetches a new token on every call instead of caching it', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');

    await getEnrichedSupportUrl();
    await getEnrichedSupportUrl();

    expect(
      Engine.context.AuthenticationController.getCustomerServiceToken,
    ).toHaveBeenCalledTimes(2);
  });

  it('logs a redacted URL and never logs the raw customer service token', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');

    await getEnrichedSupportUrl();

    const loggedArgs = jest.mocked(Logger.log).mock.calls.flat();
    expect(loggedArgs.some((arg) => String(arg).includes('jwt-token'))).toBe(
      false,
    );
    const loggedUrl = loggedArgs.find(
      (arg) => typeof arg === 'string' && arg.startsWith('https://'),
    ) as string;
    expect(
      new URL(loggedUrl).searchParams.get(
        SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN,
      ),
    ).toBe('[REDACTED]');
  });
});

describe('navigateToSupportConsent', () => {
  const mockNavigate = jest.fn();
  const mockNavigation: Parameters<typeof navigateToSupportConsent>[0] = {
    navigate: mockNavigate,
  };
  const mockOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getVersion).mockReturnValue('7.1.0');
  });

  it('navigates to the consent sheet with an onConfirm and onReject handler', () => {
    navigateToSupportConsent(mockNavigation, mockOpen, METAMASK_SUPPORT_URL);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SUPPORT_CONSENT_SHEET,
      params: {
        onConfirm: expect.any(Function),
        onReject: expect.any(Function),
      },
    });
  });

  it('opens the enriched support URL when onConfirm runs', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');

    navigateToSupportConsent(mockNavigation, mockOpen, METAMASK_SUPPORT_URL);
    const { onConfirm } = mockNavigate.mock.calls[0][1].params;
    await onConfirm();

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('customer_service_token=jwt-token'),
    );
  });

  it('opens the plain support URL when onReject runs', () => {
    navigateToSupportConsent(mockNavigation, mockOpen, METAMASK_SUPPORT_URL);
    const { onReject } = mockNavigate.mock.calls[0][1].params;
    onReject();

    const openedUrl = mockOpen.mock.calls[0][0] as string;
    expect(
      new URL(openedUrl).searchParams.has(
        SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN,
      ),
    ).toBe(false);
  });
});
