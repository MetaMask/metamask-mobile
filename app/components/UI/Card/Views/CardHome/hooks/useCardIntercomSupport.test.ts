import { renderHook } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import { getBetaSupportUrl } from '../../../../../../util/support/betaSupportUrl';
import { useCardIntercomSupport } from './useCardIntercomSupport';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockOpenSupportWithConsent = jest.fn();
jest.mock('../../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

// The `///: ONLY_INCLUDE_IF(beta)` fence is only stripped by Metro, so under
// Jest the real helper always returns the beta URL. Mocking it here is what
// makes the non-beta consent branch reachable.
jest.mock('../../../../../../util/support/betaSupportUrl', () => ({
  getBetaSupportUrl: jest.fn(() => ''),
}));

let mockIsIntercomSupportEnabled = true;
let mockProviderUserId: string | null = 'cardholder-1';
let mockProviderName: string | null = 'immersve';

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => {
    const {
      selectCardProviderUserId,
      selectCardActiveProviderId,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('../../../../../../selectors/cardController');
    const {
      selectCardIntercomSupportEnabled,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('../../../../../../selectors/featureFlagController/card');

    if (selector === selectCardIntercomSupportEnabled) {
      return mockIsIntercomSupportEnabled;
    }
    if (selector === selectCardProviderUserId) {
      return mockProviderUserId;
    }
    if (selector === selectCardActiveProviderId) {
      return mockProviderName;
    }
    return undefined;
  },
}));

describe('useCardIntercomSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsIntercomSupportEnabled = true;
    mockProviderUserId = 'cardholder-1';
    mockProviderName = 'immersve';
    (getBetaSupportUrl as jest.Mock).mockReturnValue('');
  });

  it('returns undefined while the flag is off so the caller keeps mailto routing', () => {
    mockIsIntercomSupportEnabled = false;

    const { result } = renderHook(() => useCardIntercomSupport());

    expect(result.current).toBeUndefined();
  });

  it('opens the support conversation through the consent sheet with the provider identity', () => {
    const { result } = renderHook(() => useCardIntercomSupport());

    result.current?.();

    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      `${METAMASK_SUPPORT_URL}&provider_user_id=cardholder-1&provider_name=immersve`,
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the resolved support URL in the in-app webview', () => {
    const { result } = renderHook(() => useCardIntercomSupport());

    result.current?.();
    const [openWebview] = mockOpenSupportWithConsent.mock.calls[0];
    openWebview('https://support.metamask.io/?provider_name=immersve');

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://support.metamask.io/?provider_name=immersve',
        title: 'card.card_home.contact_support',
      },
    });
  });

  it('skips the consent sheet on beta builds and opens the beta Intercom space', () => {
    (getBetaSupportUrl as jest.Mock).mockReturnValue(
      'https://intercom.help/internal-beta-testing/en/',
    );

    const { result } = renderHook(() => useCardIntercomSupport());

    result.current?.();

    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://intercom.help/internal-beta-testing/en/?provider_user_id=cardholder-1&provider_name=immersve',
        title: 'card.card_home.contact_support',
      },
    });
  });

  it('still opens support when the provider identity is unknown', () => {
    mockProviderUserId = null;
    mockProviderName = null;

    const { result } = renderHook(() => useCardIntercomSupport());

    result.current?.();

    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      METAMASK_SUPPORT_URL,
    );
  });
});
