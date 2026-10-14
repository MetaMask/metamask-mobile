import React, { type ComponentType } from 'react';
import { act, render } from '@testing-library/react-native';
import VbaKycRejected from '../VbaKycRejected';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import {
  VbaAccountProvisioningErrorAdapter,
  VbaErrorAdapter,
  VbaKycPendingAdapter,
  VbaKycRejectedAdapter,
} from './VbaStatusAdapters';

jest.mock('../VbaOnboardingStub');
jest.mock('../VbaKycRejected');
jest.mock('../hooks/useVbaOnboardingRouting');

const mockVbaOnboardingStub = jest.mocked(VbaOnboardingStub);
const mockVbaKycRejected = jest.mocked(VbaKycRejected);
const mockUseOpenVbaOnboarding = jest.mocked(useOpenVbaOnboarding);
const mockAdvance = jest.fn<Promise<void>, [unknown?]>();

interface AdapterCase {
  Adapter: ComponentType;
  source: string;
  variant: VbaOnboardingStubVariant;
}

const adapterCases: AdapterCase[] = [
  {
    Adapter: VbaKycPendingAdapter,
    source: 'kyc_pending-retry',
    variant: 'kyc_pending',
  },
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
    mockAdvance.mockResolvedValue(undefined);
    mockUseOpenVbaOnboarding.mockReturnValue(mockAdvance);
    mockVbaOnboardingStub.mockImplementation(() => <></>);
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

  it('reopens identity verification from the KYC failure page', async () => {
    render(<VbaKycRejectedAdapter />);
    const rejectedProps = mockVbaKycRejected.mock.calls[0][0];

    await act(rejectedProps.onRetry);

    expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith('kyc_rejected-retry');
    expect(mockAdvance).toHaveBeenCalledWith({ retryRejectedKyc: true });
  });
});
