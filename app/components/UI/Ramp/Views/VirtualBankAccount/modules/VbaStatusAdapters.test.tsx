import React, { type ComponentType } from 'react';
import { Linking } from 'react-native';
import { act, render } from '@testing-library/react-native';
import VbaKycPending from '../../../../KYC/Views/Status/KycPending';
import VbaKycRejected from '../../../../KYC/Views/Status/KycRejected';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import { useVbaKycStatusRedirect } from '../../../../KYC/hooks/useKycStatusRedirect';
import { trackKycVerificationUpdated } from '../../../../KYC/utils/kycVerificationAnalytics';
import {
  VbaAccountProvisioningErrorAdapter,
  VbaErrorAdapter,
  VbaKycPendingAdapter,
  VbaKycRejectedAdapter,
} from './VbaStatusAdapters';

const mockUseSelector = jest.fn();
const mockOpenSupportWithConsent = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

jest.mock('../VbaOnboardingStub');
jest.mock('../../../../KYC/Views/Status/KycPending');
jest.mock('../../../../KYC/Views/Status/KycRejected');
jest.mock('../hooks/useVbaOnboardingRouting');
jest.mock('../../../../KYC/hooks/useKycStatusRedirect');
jest.mock('../../../../KYC/utils/kycVerificationAnalytics', () => ({
  trackKycVerificationUpdated: jest.fn(),
}));

const mockVbaOnboardingStub = jest.mocked(VbaOnboardingStub);
const mockVbaKycPending = jest.mocked(VbaKycPending);
const mockVbaKycRejected = jest.mocked(VbaKycRejected);
const mockUseOpenVbaOnboarding = jest.mocked(useOpenVbaOnboarding);
const mockUseVbaKycStatusRedirect = jest.mocked(useVbaKycStatusRedirect);
const mockAdvance = jest.fn<Promise<void>, [unknown?]>();

interface AdapterCase {
  Adapter: ComponentType;
  source: string;
  variant: VbaOnboardingStubVariant;
}

const adapterCases: AdapterCase[] = [
  {
    Adapter: VbaAccountProvisioningErrorAdapter,
    source: 'account_provisioning_error-retry',
    variant: 'account_provisioning_error',
  },
  {
    Adapter: VbaErrorAdapter,
    source: 'error-retry',
    variant: 'error',
  },
];

describe('VbaStatusAdapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockAdvance.mockResolvedValue(undefined);
    mockUseOpenVbaOnboarding.mockReturnValue(mockAdvance);
    mockUseSelector.mockReturnValue({
      finalStatus: 'rejected',
      kycStatus: 'rejected',
    });
    mockVbaOnboardingStub.mockImplementation(() => <></>);
    mockVbaKycPending.mockImplementation(() => <></>);
    mockVbaKycRejected.mockImplementation(() => <></>);
  });

  it.each(adapterCases)(
    'opens onboarding from $variant retries',
    async ({ Adapter, source, variant }) => {
      render(<Adapter />);
      const stubProps = mockVbaOnboardingStub.mock.calls[0][0];

      await act(stubProps.onContinue);

      expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith(source);
      expect(stubProps.variant).toBe(variant);
      expect(mockAdvance).toHaveBeenCalledTimes(1);
    },
  );

  it('renders the KYC pending screen with the status watcher instead of a stub', () => {
    render(<VbaKycPendingAdapter />);

    expect(mockVbaKycPending).toHaveBeenCalledTimes(1);
    expect(mockUseVbaKycStatusRedirect).toHaveBeenCalledTimes(1);
    expect(mockVbaOnboardingStub).not.toHaveBeenCalled();
    expect(mockUseOpenVbaOnboarding).not.toHaveBeenCalled();
  });

  it('opens support from a rejected KYC session', async () => {
    render(<VbaKycRejectedAdapter />);
    const rejectedProps = mockVbaKycRejected.mock.calls[0][0];

    rejectedProps.onAction();

    expect(rejectedProps.action).toBe('contactSupport');
    expect(mockUseOpenVbaOnboarding).not.toHaveBeenCalled();
    expect(mockAdvance).not.toHaveBeenCalled();
    expect(mockOpenSupportWithConsent).toHaveBeenCalledTimes(1);

    const [openUrl, supportUrl] = mockOpenSupportWithConsent.mock.calls[0];
    await openUrl('https://support.example/path');

    expect(supportUrl).toBe(METAMASK_SUPPORT_URL);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://support.example/path',
    );
    expect(trackKycVerificationUpdated).not.toHaveBeenCalled();
  });

  it('opens support when no KYC session is stored', () => {
    mockUseSelector.mockReturnValue(null);

    render(<VbaKycRejectedAdapter />);
    const rejectedProps = mockVbaKycRejected.mock.calls[0][0];

    expect(rejectedProps.action).toBe('contactSupport');
    expect(mockUseOpenVbaOnboarding).not.toHaveBeenCalled();
  });

  it('opens support when kycStatus is rejected even if finalStatus is retry', () => {
    mockUseSelector.mockReturnValue({
      finalStatus: 'retry',
      kycStatus: 'rejected',
    });

    render(<VbaKycRejectedAdapter />);
    const rejectedProps = mockVbaKycRejected.mock.calls[0][0];

    expect(rejectedProps.action).toBe('contactSupport');
    expect(mockUseOpenVbaOnboarding).not.toHaveBeenCalled();
    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
  });

  it('reopens identity verification when KYC status is retry', async () => {
    mockUseSelector.mockReturnValue({
      finalStatus: 'pending',
      kycStatus: 'retry',
    });

    render(<VbaKycRejectedAdapter />);
    const rejectedProps = mockVbaKycRejected.mock.calls[0][0];

    await act(rejectedProps.onAction);

    expect(rejectedProps.action).toBe('retry');
    expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith('kyc_rejected-retry');
    expect(mockAdvance).toHaveBeenCalledWith({ retryRejectedKyc: true });
    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
  });

  it('tracks retry_started with the kyc_rejected source before reopening a retryable session', async () => {
    mockUseSelector.mockReturnValue({
      finalStatus: 'pending',
      kycStatus: 'retry',
    });

    render(<VbaKycRejectedAdapter />);
    const rejectedProps = mockVbaKycRejected.mock.calls[0][0];

    await act(rejectedProps.onAction);

    expect(trackKycVerificationUpdated).toHaveBeenCalledWith({
      status: 'retry_started',
      retrySource: 'kyc_rejected',
    });
    expect(
      jest.mocked(trackKycVerificationUpdated).mock.invocationCallOrder[0],
    ).toBeLessThan(mockAdvance.mock.invocationCallOrder[0]);
  });
});
