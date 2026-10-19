import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { useDispatch } from 'react-redux';
import OnboardingSuccess, {
  OnboardingSuccessComponent,
  ResetNavigationToHome,
} from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../constants/onboarding';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectWalletSetupCompletedAttributionAnalyticsProps } from '../../../selectors/attribution';
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';
import { finalizeOnboardingCompletion } from '../../../util/onboarding/finalizeOnboardingCompletion';

const mockNavigationDispatch = jest.fn();
let mockRouteParams: { successFlow?: ONBOARDING_SUCCESS_FLOW } | undefined = {};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      dispatch: mockNavigationDispatch,
    }),
    useRoute: () => ({
      key: 'OnboardingSuccess',
      name: 'OnboardingSuccess',
      params: mockRouteParams,
    }),
  };
});

jest.mock('../../../util/onboarding/finalizeOnboardingCompletion', () => ({
  finalizeOnboardingCompletion: jest.fn(),
}));

jest.mock('../../../selectors/onboarding', () => ({
  selectOnboardingAccountType: jest.fn(),
}));

jest.mock('../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));

jest.mock('../../../selectors/attribution', () => ({
  selectWalletSetupCompletedAttributionAnalyticsProps: jest.fn(),
}));

jest.mock('../../../selectors/qrSyncController', () => ({
  selectQrSyncNeedsProvisioning: jest.fn(),
}));

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

describe('OnboardingSuccessComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useDispatch).mockReturnValue(mockDispatch);
    jest
      .mocked(selectOnboardingAccountType)
      .mockReturnValue(AccountType.Imported);
    jest.mocked(selectBasicFunctionalityEnabled).mockReturnValue(true);
    jest
      .mocked(selectWalletSetupCompletedAttributionAnalyticsProps)
      .mockReturnValue({ utm_source: 'email' });
    jest.mocked(selectQrSyncNeedsProvisioning).mockReturnValue(true);
  });

  it('finalizes onboarding and advances without rendering the success page', () => {
    const onDone = jest.fn();

    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent
        onDone={onDone}
        successFlow={ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE}
      />,
    );

    expect(toJSON()).toBeNull();
    expect(finalizeOnboardingCompletion).toHaveBeenCalledWith({
      successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      accountType: AccountType.Imported,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: { utm_source: 'email' },
      dispatch: mockDispatch,
      discoverAccountsLogContext: 'OnboardingSuccess',
      needsQrProvisioning: true,
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('OnboardingSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    jest.mocked(useDispatch).mockReturnValue(mockDispatch);
    jest
      .mocked(selectOnboardingAccountType)
      .mockReturnValue(AccountType.Metamask);
    jest.mocked(selectBasicFunctionalityEnabled).mockReturnValue(false);
    jest
      .mocked(selectWalletSetupCompletedAttributionAnalyticsProps)
      .mockReturnValue({});
    jest.mocked(selectQrSyncNeedsProvisioning).mockReturnValue(false);
  });

  it('resets navigation to home for the requested completion flow', async () => {
    mockRouteParams = {
      successFlow: ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
    };

    renderWithProvider(<OnboardingSuccess />);

    await waitFor(() => {
      expect(finalizeOnboardingCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          successFlow: ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
        }),
      );
      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        ResetNavigationToHome,
      );
    });
  });

  it('uses backed-up SRP completion when route params are absent', async () => {
    mockRouteParams = undefined;

    renderWithProvider(<OnboardingSuccess />);

    await waitFor(() => {
      expect(finalizeOnboardingCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
        }),
      );
    });
  });
});
