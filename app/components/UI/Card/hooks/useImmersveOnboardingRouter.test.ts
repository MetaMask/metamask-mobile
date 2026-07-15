import { renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useContext } from 'react';
import { useImmersveOnboardingRouter } from './useImmersveOnboardingRouter';
import Routes from '../../../../constants/navigation/Routes';
import type { ImmersveNextAction } from '../util/immersvePrerequisites';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({ colors: { success: { default: 'mock-success' } } }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockShowToast = jest.fn();

const getRoute = () => {
  const { result } = renderHook(() => useImmersveOnboardingRouter());
  return result.current;
};

describe('useImmersveOnboardingRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      reset: mockReset,
    });
    (useContext as jest.Mock).mockReturnValue({
      toastRef: { current: { showToast: mockShowToast } },
    });
  });

  it('routes contact to SET_PHONE_NUMBER with email + countryKey', () => {
    const action: ImmersveNextAction = {
      type: 'contact',
      needsEmail: true,
      needsPhone: true,
    };
    getRoute()(action, { email: 'a@b.co', countryKey: 'GB' });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.SET_PHONE_NUMBER,
      { countryKey: 'GB', immersve: true, email: 'a@b.co' },
    );
  });

  it.each(['kyc', 'pending', 'expected_spend'] as const)(
    'routes %s to KYC_PROCESSING',
    (type) => {
      getRoute()({ type } as ImmersveNextAction, { countryKey: 'GB' });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.KYC_PROCESSING,
        { countryKey: 'GB', kycUrl: undefined },
      );
    },
  );

  it('forwards the kyc url to KYC_PROCESSING so it can skip the first poll', () => {
    getRoute()(
      { type: 'kyc', url: 'https://verify.immersve.com/abc' },
      { countryKey: 'GB' },
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.KYC_PROCESSING,
      { countryKey: 'GB', kycUrl: 'https://verify.immersve.com/abc' },
    );
  });

  it('routes funding to FUNDING_APPROVAL with countryKey', () => {
    getRoute()(
      {
        type: 'funding',
        write: {
          abi: [],
          contractAddress: '0x',
          method: 'approve',
          params: {},
        },
      },
      { countryKey: 'GB' },
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CARD.ONBOARDING.FUNDING_APPROVAL,
      { countryKey: 'GB' },
    );
  });

  it('resets to KYC_FAILED when rejected', () => {
    getRoute()({ type: 'rejected' });

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
    });
  });

  it('shows a toast and resets to Card Home when active', () => {
    getRoute()({ type: 'active' });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: 'card.card_onboarding.sign_up.account_exists_toast' },
        ],
      }),
    );
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  });
});
