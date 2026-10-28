import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { CommonActions } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import Routes from '../../../../../constants/navigation/Routes';
import { ensureMusdAutoramp } from '../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { selectSelectedVbaWalletAddress } from '../../../../../selectors/rampsController';
import { selectMoneyMovementNeobank } from '../../../../../selectors/featureFlagController/moneyAccount';
import VbaIdentityVerified, {
  VbaIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';

const WALLET_ADDRESS = '0x1234567890AbcdEF1234567890aBcdef12345678';

const mockNavigate = jest.fn();
const mockParentDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: jest.fn(),
    getState: () => ({
      index: 0,
      routeNames: ['VbaIdentityVerified'],
      routes: [{ name: 'VbaIdentityVerified' }],
    }),
    getParent: () => ({
      navigate: jest.fn(),
      dispatch: mockParentDispatch,
      getState: () => ({
        index: 0,
        routeNames: ['Home', 'RampVbaOnboarding', 'RampVbaDetails'],
        routes: [{ name: 'Home' }],
      }),
      getParent: () => undefined,
    }),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      registerMoneyAccountWallet: jest.fn(),
      createAutoramp: jest.fn(),
    },
  },
}));

jest.mock('../../../Ramp/Views/VirtualBankAccount/ensureMusdAutoramp', () => ({
  ensureMusdAutoramp: jest.fn(),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  ...jest.requireActual('../../../../../selectors/rampsController'),
  selectSelectedVbaWalletAddress: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/moneyAccount',
    ),
    selectMoneyMovementNeobank: jest.fn(),
  }),
);

const mockEnsureMusdAutoramp = jest.mocked(ensureMusdAutoramp);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockSelectSelectedVbaWalletAddress = jest.mocked(
  selectSelectedVbaWalletAddress,
);
const mockSelectMoneyMovementNeobank = jest.mocked(selectMoneyMovementNeobank);

const STATE = {
  engine: {
    backgroundState: {
      GeolocationController: { location: 'BR' },
    },
  },
} as DeepPartial<RootState>;

const renderScreen = ({ chooseCurrency = false } = {}) => {
  mockSelectMoneyMovementNeobank.mockReturnValue({
    isEnabled: true,
    regions: ['BR', 'US'],
    regionCurrencies: { BR: 'BRL', US: 'USD' },
    defaultCurrency: 'USD',
    chooseCurrency,
  } as unknown as ReturnType<typeof selectMoneyMovementNeobank>);
  return renderWithProvider(<VbaIdentityVerified />, { state: STATE });
};

describe('VbaIdentityVerified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureMusdAutoramp.mockResolvedValue('ready');
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockSelectSelectedVbaWalletAddress.mockReturnValue(WALLET_ADDRESS);
  });

  it('renders the identity verified title and description', () => {
    const { getByText } = renderScreen();

    expect(
      getByText(strings('virtual_bank_account.identity_verified.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.identity_verified.description')),
    ).toBeOnTheScreen();
  });

  it('opens details from Continue', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(mockParentDispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 1,
        routes: [{ name: Routes.HOME_TABS }, { name: Routes.RAMP.VBA_DETAILS }],
      }),
    );
  });

  it('returns to Money home from Back', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(VbaIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  describe('account setup on mount', () => {
    it('starts setup once with the region currency', () => {
      renderScreen();

      expect(mockEnsureMusdAutoramp).toHaveBeenCalledTimes(1);
      expect(mockEnsureMusdAutoramp).toHaveBeenCalledWith(
        WALLET_ADDRESS,
        'BRL',
      );
    });

    it('does not start setup when chooseCurrency is on', () => {
      renderScreen({ chooseCurrency: true });

      expect(mockEnsureMusdAutoramp).not.toHaveBeenCalled();
    });

    it('does not start setup without a wallet', () => {
      mockSelectSelectedVbaWalletAddress.mockReturnValue(null);

      renderScreen();

      expect(mockEnsureMusdAutoramp).not.toHaveBeenCalled();
    });

    it('does not start setup when the network tier is NONE', () => {
      mockUseNetworkTier.mockReturnValue('NONE');

      renderScreen();

      expect(mockEnsureMusdAutoramp).not.toHaveBeenCalled();
    });

    it('starts setup once the network comes back', () => {
      mockUseNetworkTier.mockReturnValue('NONE');
      const { rerender } = renderScreen();
      mockUseNetworkTier.mockReturnValue('WIFI');

      rerender(<VbaIdentityVerified />);

      expect(mockEnsureMusdAutoramp).toHaveBeenCalledTimes(1);
      expect(mockEnsureMusdAutoramp).toHaveBeenCalledWith(
        WALLET_ADDRESS,
        'BRL',
      );
    });

    it('does not rerun setup when the network tier changes', () => {
      const { rerender } = renderScreen();
      mockUseNetworkTier.mockReturnValue('FAST_CELLULAR');

      rerender(<VbaIdentityVerified />);

      expect(mockEnsureMusdAutoramp).toHaveBeenCalledTimes(1);
    });

    it('keeps the screen and does not navigate when setup rejects', async () => {
      mockEnsureMusdAutoramp.mockRejectedValue(new Error('setup failed'));

      const { getByTestId } = renderScreen();
      await act(async () => {
        await Promise.resolve();
      });

      expect(
        getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockParentDispatch).not.toHaveBeenCalled();
    });
  });
});
