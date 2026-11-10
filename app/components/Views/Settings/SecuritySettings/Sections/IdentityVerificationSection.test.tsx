import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import IdentityVerificationSection from './IdentityVerificationSection';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { selectKycSessionStatus } from '../../../../../selectors/kycController';
import { selectMoneyMovementNeobank } from '../../../../../selectors/featureFlagController/moneyAccount';
import { SECURITY_SETTINGS_IDENTITY_VERIFICATION_BUTTON } from '../SecuritySettings.constants';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../../../selectors/kycController', () => ({
  selectKycSessionStatus: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyMovementNeobank: jest.fn(),
  }),
);

const mockSelectKycSessionStatus = jest.mocked(selectKycSessionStatus);
const mockSelectMoneyMovementNeobank = jest.mocked(selectMoneyMovementNeobank);

const SESSION_STATUS = {
  id: 'session-1',
  finalStatus: 'approved',
  externalUserId: 'external-user-1',
  kycStatus: 'approved',
  vendor: 'moonpay',
  vendorStatus: 'approved',
} as KycSessionStatus;

const arrange = ({
  isFlagEnabled = true,
  hasSession = true,
}: { isFlagEnabled?: boolean; hasSession?: boolean } = {}) => {
  mockSelectKycSessionStatus.mockReturnValue(
    hasSession ? SESSION_STATUS : null,
  );
  mockSelectMoneyMovementNeobank.mockReturnValue({
    isEnabled: isFlagEnabled,
    regions: [],
    regionCurrencies: {},
    defaultCurrency: undefined,
    chooseCurrency: false,
    regionOverride: undefined,
  } as ReturnType<typeof selectMoneyMovementNeobank>);

  return renderWithProvider(<IdentityVerificationSection />);
};

describe('IdentityVerificationSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when the flag is on and a KYC session exists', () => {
    const { getByText } = arrange();

    expect(getByText(strings('identity_verification.title'))).toBeOnTheScreen();
  });

  it('navigates to the identity verification screen when pressed', () => {
    const { getByTestId } = arrange();

    fireEvent.press(
      getByTestId(SECURITY_SETTINGS_IDENTITY_VERIFICATION_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SETTINGS.IDENTITY_VERIFICATION,
    );
  });

  it('renders nothing when the customer has no KYC session', () => {
    const { queryByText } = arrange({ hasSession: false });

    expect(queryByText(strings('identity_verification.title'))).toBeNull();
  });

  it('renders nothing when the feature flag is off', () => {
    const { queryByText } = arrange({ isFlagEnabled: false });

    expect(queryByText(strings('identity_verification.title'))).toBeNull();
  });
});
