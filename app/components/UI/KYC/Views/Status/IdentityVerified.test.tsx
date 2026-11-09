import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { CommonActions } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import VbaIdentityVerified, {
  VbaIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';

jest.mock('../../hooks/useTrackKycResultViewed');

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

describe('VbaIdentityVerified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders copy and opens details from Continue without creating an account', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <VbaIdentityVerified />,
    );

    expect(
      getByText(strings('virtual_bank_account.identity_verified.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('virtual_bank_account.identity_verified.description')),
    ).toBeOnTheScreen();

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
    const { getByTestId } = renderWithProvider(<VbaIdentityVerified />);

    fireEvent.press(getByTestId(VbaIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('reports the approved result as viewed', () => {
    renderWithProvider(<VbaIdentityVerified />);

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('approved');
  });
});
