import { renderHook } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import Logger from '../../../../util/Logger';
import { getBetaSupportUrl } from '../../../../util/support/betaSupportUrl';
import {
  useSubmitSocialAppeal,
  type SocialAppeal,
} from './useSubmitSocialAppeal';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockOpenSupportWithConsent = jest.fn();
jest.mock('../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

jest.mock('../../../../util/support/betaSupportUrl', () => ({
  getBetaSupportUrl: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const APPEAL: SocialAppeal = {
  email: 'alex@example.com',
  message: 'I think this is wrong.',
  decision: 'post-removed',
  handle: 'alphawhale',
  reason: 'Promises guaranteed returns',
};

const setup = () => {
  const onSent = jest.fn();
  const onFailed = jest.fn();
  const { result } = renderHook(() =>
    useSubmitSocialAppeal({ onSent, onFailed }),
  );
  return { submit: result.current, onSent, onFailed };
};

/** The opener the hook hands the consent flow. */
const getConsentOpener = (): ((url: string) => void) =>
  mockOpenSupportWithConsent.mock.calls[0][0];

describe('useSubmitSocialAppeal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getBetaSupportUrl).mockReturnValue('');
  });

  it('asks for consent against a support URL that carries the appeal', () => {
    const { submit, onSent } = setup();

    submit(APPEAL);

    const [, baseUrl, onOpenSupport] = mockOpenSupportWithConsent.mock.calls[0];
    expect(baseUrl).toContain(METAMASK_SUPPORT_URL);
    const url = new URL(baseUrl);
    expect(url.searchParams.get('appeal_email')).toBe('alex@example.com');
    expect(url.searchParams.get('appeal_decision')).toBe('post-removed');
    expect(onOpenSupport).toBe(onSent);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });

  it('opens the support URL in the in-app browser once the consent flow responds', () => {
    const { submit } = setup();
    submit(APPEAL);

    getConsentOpener()('https://support.metamask.io/?x=1');

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://support.metamask.io/?x=1',
        title: 'Contact support',
      },
    });
  });

  it('reports a failure and rethrows so the consent flow skips the success callback', () => {
    const failure = new Error('navigator not ready');
    mockNavigate.mockImplementationOnce(() => {
      throw failure;
    });
    const { submit, onFailed, onSent } = setup();
    submit(APPEAL);

    expect(() => getConsentOpener()('https://support.metamask.io/')).toThrow(
      failure,
    );

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onSent).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      failure,
      expect.stringContaining('failed to open support'),
    );
  });

  it('skips the consent sheet and opens the beta support URL with the appeal', () => {
    jest
      .mocked(getBetaSupportUrl)
      .mockReturnValue('https://intercom.help/internal-beta-testing/en/');
    const { submit, onSent } = setup();

    submit(APPEAL);

    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
    const [route, options] = mockNavigate.mock.calls[0] as [
      string,
      { params: { url: string } },
    ];
    expect(route).toBe(Routes.WEBVIEW.MAIN);
    expect(options.params.url).toMatch(
      /^https:\/\/intercom\.help\/internal-beta-testing\/en\/\?appeal_type=social_moderation&/,
    );
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('reports a failure instead of success when the beta support URL cannot open', () => {
    jest
      .mocked(getBetaSupportUrl)
      .mockReturnValue('https://intercom.help/internal-beta-testing/en/');
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('navigator not ready');
    });
    const { submit, onSent, onFailed } = setup();

    submit(APPEAL);

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onSent).not.toHaveBeenCalled();
  });
});
