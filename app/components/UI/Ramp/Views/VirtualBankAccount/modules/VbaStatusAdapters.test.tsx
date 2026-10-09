import React, { type ComponentType } from 'react';
import { act, render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import VbaKycRejected from '../VbaKycRejected';
import VbaOnboardingError from '../VbaOnboardingError';
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
jest.mock('../VbaOnboardingError');
jest.mock('../VbaKycRejected');
jest.mock('../hooks/useVbaOnboardingRouting');

const mockVbaOnboardingStub = jest.mocked(VbaOnboardingStub);
const mockVbaOnboardingError = jest.mocked(VbaOnboardingError);
const mockVbaKycRejected = jest.mocked(VbaKycRejected);
const mockUseOpenVbaOnboarding = jest.mocked(useOpenVbaOnboarding);
const mockAdvance = jest.fn<Promise<void>, [unknown?]>();

interface AdapterCase {
  Adapter: ComponentType;
  source: string;
  variant: VbaOnboardingStubVariant;
}

interface ErrorAdapterCase {
  Adapter: ComponentType;
  source: string;
  variant: 'account_provisioning_error' | 'error';
}

const adapterCases: AdapterCase[] = [
  {
    Adapter: VbaKycPendingAdapter,
    source: 'kyc_pending-retry',
    variant: 'kyc_pending',
  },
];

const errorAdapterCases: ErrorAdapterCase[] = [
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
    mockVbaOnboardingError.mockImplementation(() => <></>);
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

  it.each(errorAdapterCases)(
    'rehydrates onboarding from the $variant page',
    async ({ Adapter, source, variant }) => {
      render(<Adapter />);
      const errorProps = mockVbaOnboardingError.mock.calls[0][0];

      await act(() => errorProps.primaryAction.onPress());

      expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith(source);
      expect(errorProps.title).toBe(
        strings(`virtual_bank_account.${variant}.title`),
      );
      expect(errorProps.description).toBe(
        strings(`virtual_bank_account.${variant}.description`),
      );
      expect(errorProps.primaryAction.label).toBe(
        strings(`virtual_bank_account.${variant}.button`),
      );
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
