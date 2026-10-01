import React, { type ComponentType } from 'react';
import { act, render } from '@testing-library/react-native';
import VbaOnboardingError, {
  type VbaOnboardingErrorVariant,
} from '../VbaOnboardingError';
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
jest.mock('../hooks/useVbaOnboardingRouting');

const mockVbaOnboardingStub = jest.mocked(VbaOnboardingStub);
const mockVbaOnboardingError = jest.mocked(VbaOnboardingError);
const mockUseOpenVbaOnboarding = jest.mocked(useOpenVbaOnboarding);
const mockAdvance = jest.fn<Promise<void>, []>();

interface StubAdapterCase {
  Adapter: ComponentType;
  source: string;
  variant: VbaOnboardingStubVariant;
}

interface ErrorAdapterCase {
  Adapter: ComponentType;
  source: string;
  variant: VbaOnboardingErrorVariant;
}

const stubAdapterCases: StubAdapterCase[] = [
  {
    Adapter: VbaKycPendingAdapter,
    source: 'kyc_pending-retry',
    variant: 'kyc_pending',
  },
  {
    Adapter: VbaKycRejectedAdapter,
    source: 'kyc_rejected-retry',
    variant: 'kyc_rejected',
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
  });

  it.each(stubAdapterCases)(
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
    'rehydrates onboarding from $variant retries',
    async ({ Adapter, source, variant }) => {
      render(<Adapter />);
      const errorProps = mockVbaOnboardingError.mock.calls[0][0];

      await act(errorProps.onRetry);

      expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith(source);
      expect(errorProps.variant).toBe(variant);
      expect(mockAdvance).toHaveBeenCalledTimes(1);
    },
  );
});
