import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { RootState } from '../../../../../reducers';
import Routes from '../../../../../constants/navigation/Routes';
import KycPending, { VbaKycPendingSelectorsIDs } from './KycPending';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const createState = (
  userStatus: string | null,
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      KycController: {
        userStatus,
      },
    },
  },
});

describe('KycPending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the pending copy when user status is pending', () => {
    const { getByTestId } = renderWithProvider(<KycPending />, {
      state: createState('pending'),
    });

    expect(getByTestId(VbaKycPendingSelectorsIDs.TITLE)).toBeOnTheScreen();
    expect(
      getByTestId(VbaKycPendingSelectorsIDs.BACK_TO_HOME_BUTTON),
    ).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to Money home when Back to home is pressed', () => {
    const { getByTestId } = renderWithProvider(<KycPending />, {
      state: createState('pending'),
    });

    fireEvent.press(getByTestId(VbaKycPendingSelectorsIDs.BACK_TO_HOME_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('redirects home when user status is decided as completed', () => {
    const { queryByTestId } = renderWithProvider(<KycPending />, {
      state: createState('completed'),
    });

    expect(queryByTestId(VbaKycPendingSelectorsIDs.CONTAINER)).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('stays on screen while the status has not been read back yet', () => {
    const { getByTestId } = renderWithProvider(<KycPending />, {
      state: createState(null),
    });

    expect(getByTestId(VbaKycPendingSelectorsIDs.TITLE)).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
