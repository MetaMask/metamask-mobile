import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NeobankOnboardingStage } from '@metamask/ramps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import NeobankOnboardingRouter from './NeobankOnboardingRouter';

jest.mock('@metamask/ramps-controller', () => ({
  NeobankOnboardingStage: {
    VendorTermsRequired: 'VendorTermsRequired',
    KycStartedIncomplete: 'KycStartedIncomplete',
  },
}));

const mockHydrateNeobankStore = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockUseSelector = jest.fn((_selector: unknown) => ({
  address: '0xabc',
}));
const mockNavigation = {
  navigate: mockNavigate,
  reset: mockReset,
  goBack: jest.fn(),
};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      hydrateNeobankStore: (...args: unknown[]) =>
        mockHydrateNeobankStore(...args),
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) =>
    jest.requireActual('react').useEffect(callback, [callback]),
}));

describe('NeobankOnboardingRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue({ address: '0xabc' });
  });

  it('hydrates with the selected account and opens terms', async () => {
    mockHydrateNeobankStore.mockResolvedValue(
      NeobankOnboardingStage.VendorTermsRequired,
    );

    render(<NeobankOnboardingRouter />);

    await waitFor(() => {
      expect(mockHydrateNeobankStore).toHaveBeenCalledWith({
        walletAddress: '0xabc',
      });
      expect(mockUseSelector).toHaveBeenCalledWith(selectPrimaryMoneyAccount);
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.RAMP.GET_PIX_KEY }],
      });
    });
  });

  it('opens the KYC page for an incomplete KYC session', async () => {
    mockHydrateNeobankStore.mockResolvedValue(
      NeobankOnboardingStage.KycStartedIncomplete,
    );

    render(<NeobankOnboardingRouter />);

    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.RAMP.VBA_KYC }],
      }),
    );
  });

  it('shows a retryable error when hydration fails', async () => {
    mockHydrateNeobankStore.mockRejectedValue(new Error('network down'));

    const { getByText } = render(<NeobankOnboardingRouter />);

    await waitFor(() =>
      expect(
        getByText("We couldn't check your Money account"),
      ).toBeOnTheScreen(),
    );
  });
});
