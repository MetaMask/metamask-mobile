import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import VbaIdentityVerified, {
  VbaIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';

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

const mockRegister = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      registerMoneyAccountWallet: (...args: unknown[]) => mockRegister(...args),
      createAutoramp: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

describe('VbaIdentityVerified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the verified identity screen', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaIdentityVerified />,
    );

    expect(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.ILLUSTRATION),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.identity_verified.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.identity_verified.description')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.identity_verified.button')),
    ).toBeOnTheScreen();
  });

  it('opens account details from Continue without signing or creating an account', () => {
    const { getByTestId } = renderWithProvider(<VbaIdentityVerified />);

    fireEvent.press(
      getByTestId(VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(mockParentDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NAVIGATE',
        payload: expect.objectContaining({
          name: Routes.RAMP.VBA_DETAILS,
        }),
      }),
    );
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns to Money home from Back', () => {
    const { getByTestId } = renderWithProvider(<VbaIdentityVerified />);

    fireEvent.press(getByTestId(VbaIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockParentDispatch).not.toHaveBeenCalled();
  });
});
