import { getVersion } from 'react-native-device-info';
import Engine from '../../core/Engine';
import Logger from '../Logger';
import Routes from '../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../constants/urls';
import {
  buildSupportUrl,
  confirmSupportConsent,
  getEnrichedSupportUrl,
  navigateToSupportConsent,
  redactCustomerServiceToken,
  rejectSupportConsent,
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

describe('confirmSupportConsent', () => {
  const mockOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getVersion).mockReturnValue('7.1.0');
  });

  it('opens the enriched support URL', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');

    await confirmSupportConsent(mockOpen, METAMASK_SUPPORT_URL);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('customer_service_token=jwt-token'),
    );
  });

  it('logs and swallows errors thrown by the opener', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');
    mockOpen.mockRejectedValueOnce(new Error('failed to open'));

    await expect(
      confirmSupportConsent(mockOpen, METAMASK_SUPPORT_URL),
    ).resolves.toBeUndefined();

    expect(Logger.log).toHaveBeenCalledWith(
      '[SupportConsent] Failed to open support URL',
      expect.any(Error),
    );
  });

  it('fires onOpenSupport once the opener resolves', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');
    const mockOnOpenSupport = jest.fn();

    await confirmSupportConsent(
      mockOpen,
      METAMASK_SUPPORT_URL,
      mockOnOpenSupport,
    );

    expect(mockOnOpenSupport).toHaveBeenCalledTimes(1);
  });

  // Analytics should reflect a URL that actually opened, not merely a
  // confirm tap that could still fail (e.g. no browser available).
  it('does not fire onOpenSupport when the opener throws', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');
    mockOpen.mockRejectedValueOnce(new Error('failed to open'));
    const mockOnOpenSupport = jest.fn();

    await confirmSupportConsent(
      mockOpen,
      METAMASK_SUPPORT_URL,
      mockOnOpenSupport,
    );

    expect(mockOnOpenSupport).not.toHaveBeenCalled();
  });
});

describe('rejectSupportConsent', () => {
  const mockOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the raw base URL with no device details', async () => {
    await rejectSupportConsent(mockOpen, METAMASK_SUPPORT_URL);

    const openedUrl = mockOpen.mock.calls[0][0] as string;
    expect(openedUrl).toBe(METAMASK_SUPPORT_URL);
    const params = new URL(openedUrl).searchParams;
    expect(params.has(SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN)).toBe(false);
    expect(params.has(SUPPORT_URL_PARAM_VERSION)).toBe(false);
  });

  it('logs and swallows errors thrown by the opener', async () => {
    mockOpen.mockRejectedValueOnce(new Error('failed to open'));

    await expect(
      rejectSupportConsent(mockOpen, METAMASK_SUPPORT_URL),
    ).resolves.toBeUndefined();

    expect(Logger.log).toHaveBeenCalledWith(
      '[SupportConsent] Failed to open support URL',
      expect.any(Error),
    );
  });

  it('fires onOpenSupport once the opener resolves', async () => {
    const mockOnOpenSupport = jest.fn();

    await rejectSupportConsent(
      mockOpen,
      METAMASK_SUPPORT_URL,
      mockOnOpenSupport,
    );

    expect(mockOnOpenSupport).toHaveBeenCalledTimes(1);
  });

  // Analytics should reflect a URL that actually opened, not merely a
  // reject tap that could still fail (e.g. no browser available).
  it('does not fire onOpenSupport when the opener throws', async () => {
    mockOpen.mockRejectedValueOnce(new Error('failed to open'));
    const mockOnOpenSupport = jest.fn();

    await rejectSupportConsent(
      mockOpen,
      METAMASK_SUPPORT_URL,
      mockOnOpenSupport,
    );

    expect(mockOnOpenSupport).not.toHaveBeenCalled();
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

  it('opens the raw base URL with no device details when onReject runs', () => {
    navigateToSupportConsent(mockNavigation, mockOpen, METAMASK_SUPPORT_URL);
    const { onReject } = mockNavigate.mock.calls[0][1].params;
    onReject();

    const openedUrl = mockOpen.mock.calls[0][0] as string;
    expect(openedUrl).toBe(METAMASK_SUPPORT_URL);
    const params = new URL(openedUrl).searchParams;
    expect(params.has(SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN)).toBe(false);
    expect(params.has(SUPPORT_URL_PARAM_VERSION)).toBe(false);
  });

  it('fires onOpenSupport and opens the enriched URL when onConfirm runs', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');
    const mockOnOpenSupport = jest.fn();

    navigateToSupportConsent(
      mockNavigation,
      mockOpen,
      METAMASK_SUPPORT_URL,
      mockOnOpenSupport,
    );
    const { onConfirm } = mockNavigate.mock.calls[0][1].params;
    await onConfirm();

    expect(mockOnOpenSupport).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('customer_service_token=jwt-token'),
    );
  });

  it('fires onOpenSupport and opens the raw URL when onReject runs', async () => {
    const mockOnOpenSupport = jest.fn();

    navigateToSupportConsent(
      mockNavigation,
      mockOpen,
      METAMASK_SUPPORT_URL,
      mockOnOpenSupport,
    );
    const { onReject } = mockNavigate.mock.calls[0][1].params;
    // onReject now delegates to the async rejectSupportConsent, which fires
    // onOpenSupport only after the opener resolves — await so that
    // microtask has a chance to run before asserting.
    await onReject();

    expect(mockOnOpenSupport).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(METAMASK_SUPPORT_URL);
  });

  // Guards against a regression of the Bugbot-flagged timing bug: onOpenSupport
  // must not fire merely because onConfirm/onReject was invoked — only once the
  // opener itself has actually succeeded.
  it('does not fire onOpenSupport when the opener throws on confirm', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getCustomerServiceToken)
      .mockResolvedValue('jwt-token');
    mockOpen.mockRejectedValueOnce(new Error('failed to open'));
    const mockOnOpenSupport = jest.fn();

    navigateToSupportConsent(
      mockNavigation,
      mockOpen,
      METAMASK_SUPPORT_URL,
      mockOnOpenSupport,
    );
    const { onConfirm } = mockNavigate.mock.calls[0][1].params;
    await onConfirm();

    expect(mockOnOpenSupport).not.toHaveBeenCalled();
  });
});
