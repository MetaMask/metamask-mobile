import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectCardIntercomSupportEnabled } from '../../../../../../selectors/featureFlagController/card';
import { appendCardSupportParams } from '../../../../../../util/support';
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

jest.mock('../../../../../../util/support', () => ({
  appendCardSupportParams: jest.fn((url: string) => `${url}?card=1`),
}));

jest.mock('../../../../../../util/support/betaSupportUrl', () => ({
  getBetaSupportUrl: jest.fn(() => ''),
}));

let mockIsIntercomSupportEnabled = true;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useCardIntercomSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsIntercomSupportEnabled = true;
    (getBetaSupportUrl as jest.Mock).mockReturnValue('');
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectCardIntercomSupportEnabled) {
        return mockIsIntercomSupportEnabled;
      }
      return undefined;
    });
  });

  it('returns undefined while the flag is off so the caller keeps mailto routing', () => {
    mockIsIntercomSupportEnabled = false;

    const { result } = renderHook(() => useCardIntercomSupport());

    expect(result.current).toBeUndefined();
  });

  it('opens the support conversation through the consent sheet without pre-building card params', () => {
    const { result } = renderHook(() => useCardIntercomSupport());

    result.current?.();

    expect(mockOpenSupportWithConsent).toHaveBeenCalledTimes(1);
    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(appendCardSupportParams).not.toHaveBeenCalled();
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

  it('skips the consent sheet on beta builds and opens the beta Intercom space with card params', () => {
    (getBetaSupportUrl as jest.Mock).mockReturnValue(
      'https://intercom.help/internal-beta-testing/en/',
    );

    const { result } = renderHook(() => useCardIntercomSupport());

    result.current?.();

    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://intercom.help/internal-beta-testing/en/?card=1',
        title: 'card.card_home.contact_support',
      },
    });
  });
});
