import React, { type ComponentType } from 'react';
import { act, render } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import VbaIdentityVerified from '../../../../KYC/Views/Status/IdentityVerified';
import VbaKycPending from '../../../../KYC/Views/Status/KycPending';
import VbaKycRejected from '../../../../KYC/Views/Status/KycRejected';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import {
  navigateToVbaOnboardingDestination,
  useOpenVbaOnboarding,
} from '../hooks/useVbaOnboardingRouting';
import { useStartVbaAccountSetupEarly } from '../hooks/useStartVbaAccountSetupEarly';
import { VbaOnboardingRoutes } from '../routes';
import { useVbaKycStatusRedirect } from '../../../../KYC/hooks/useKycStatusRedirect';
import {
  VbaAccountProvisioningErrorAdapter,
  VbaErrorAdapter,
  VbaIdentityVerifiedAdapter,
  VbaKycPendingAdapter,
  VbaKycRejectedAdapter,
} from './VbaStatusAdapters';

jest.mock('../VbaOnboardingStub');
jest.mock('../../../../KYC/Views/Status/IdentityVerified');
jest.mock('../hooks/useStartVbaAccountSetupEarly');
jest.mock('../../../../KYC/Views/Status/KycPending');
jest.mock('../../../../KYC/Views/Status/KycRejected');
jest.mock('../hooks/useVbaOnboardingRouting');
jest.mock('../../../../KYC/hooks/useKycStatusRedirect');

const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() };
let mockChooseCurrency = false;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => ({ chooseCurrency: mockChooseCurrency }),
}));

const mockVbaIdentityVerified = jest.mocked(VbaIdentityVerified);
const mockUseStartVbaAccountSetupEarly = jest.mocked(
  useStartVbaAccountSetupEarly,
);
const mockNavigateToVbaOnboardingDestination = jest.mocked(
  navigateToVbaOnboardingDestination,
);
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
    mockAdvance.mockResolvedValue(undefined);
    mockUseOpenVbaOnboarding.mockReturnValue(mockAdvance);
    mockVbaOnboardingStub.mockImplementation(() => <></>);
    mockVbaKycPending.mockImplementation(() => <></>);
    mockVbaIdentityVerified.mockImplementation(() => <></>);
    mockChooseCurrency = false;
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

  it('reopens identity verification from the KYC failure page', async () => {
    render(<VbaKycRejectedAdapter />);
    const rejectedProps = mockVbaKycRejected.mock.calls[0][0];

    await act(rejectedProps.onRetry);

    expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith('kyc_rejected-retry');
    expect(mockAdvance).toHaveBeenCalledWith({ retryRejectedKyc: true });
  });

  describe('VbaIdentityVerifiedAdapter', () => {
    const renderAdapter = () => {
      render(<VbaIdentityVerifiedAdapter />);
      return mockVbaIdentityVerified.mock.calls[0][0];
    };

    it('starts account setup early', () => {
      renderAdapter();

      expect(mockUseStartVbaAccountSetupEarly).toHaveBeenCalled();
    });

    it('opens account details from Continue', () => {
      const props = renderAdapter();

      props.onContinue();

      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        mockNavigation,
        'complete',
      );
    });

    it('opens Choose Currency from Continue when chooseCurrency is on', () => {
      mockChooseCurrency = true;
      const props = renderAdapter();

      props.onContinue();

      expect(mockNavigation.dispatch).toHaveBeenCalledWith(
        StackActions.push(VbaOnboardingRoutes.CHOOSE_CURRENCY),
      );
      expect(mockNavigateToVbaOnboardingDestination).not.toHaveBeenCalled();
    });

    it('returns to Money home from Back', () => {
      const props = renderAdapter();

      props.onBack();

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });
  });
});
