import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { getSessionProfileId } from '../../../../../util/notifications/utils/get-session-profile-id';
import MockKycSuccess from './MockKycSuccess';
import { MockKycSuccessSelectorsIDs } from './MockKycSuccess.testIds';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';

const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      provisionMoneyAccount: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/notifications/utils/get-session-profile-id');

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  selectSelectedInternalAccountAddress: () => WALLET_ADDRESS,
}));

const mockConnect = jest.fn();
const mockAddListener = jest.fn();

jest.mock('./neobank/NeobankWebSocket', () => ({
  NeobankWebSocket: {
    getInstance: () => ({
      connect: mockConnect,
      addListener: mockAddListener,
      disconnect: jest.fn(),
    }),
  },
}));

const mockRampsController = Engine.context.RampsController as unknown as {
  provisionMoneyAccount: jest.Mock;
};

const setUp = () => {
  jest.clearAllMocks();
  jest.mocked(getSessionProfileId).mockResolvedValue('profile-1');
  mockRampsController.provisionMoneyAccount.mockResolvedValue({
    registration: {
      type: 'registered',
      registration: {
        id: 'reg-1',
        address: WALLET_ADDRESS,
        blockchain: 'Monad',
      },
    },
    autoramp: {
      id: 'autoramp-1',
      customerId: 'cus_1',
      status: 'Created',
    },
  });
};

describe('MockKycSuccess', () => {
  it('navigates back when the header back button is pressed', () => {
    setUp();
    const { getByTestId } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders the signing step before autoramp creation', () => {
    setUp();
    const { getByText } = renderWithProvider(<MockKycSuccess />);

    expect(getByText('Sign wallet ownership')).toBeTruthy();
    expect(getByText('Create the autoramp')).toBeTruthy();
    expect(getByText(/five real steps/)).toBeTruthy();
  });

  it('provisions the Money Account when the finish button is pressed', async () => {
    setUp();
    const { getByTestId, getByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));

    await waitFor(() => {
      expect(mockRampsController.provisionMoneyAccount).toHaveBeenCalledWith({
        address: WALLET_ADDRESS,
        autoramp: buildMoneyAccountAutorampParams(WALLET_ADDRESS),
      });
    });
    expect(getByText(/registered · chain = Monad/)).toBeTruthy();
    expect(mockConnect).toHaveBeenCalled();
  });

  it('stops the pipeline when provisioning fails', async () => {
    setUp();
    mockRampsController.provisionMoneyAccount.mockRejectedValue(
      new Error('User rejected the request'),
    );

    const { getByTestId, getByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));

    await waitFor(() => {
      expect(getByText('User rejected the request')).toBeTruthy();
    });

    expect(getByText('Pipeline stopped')).toBeTruthy();
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('surfaces a non-completed KYC status from provisionMoneyAccount', async () => {
    setUp();
    mockRampsController.provisionMoneyAccount.mockRejectedValue(
      new Error(
        'KYC status is "pending". The wallet can only be registered once it reads completed.',
      ),
    );
    const { getByTestId, findByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));

    expect(await findByText(/KYC status is "pending"/u)).toBeOnTheScreen();
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('navigates to the bank account once the autoramp exists', async () => {
    setUp();
    const { getByTestId, findByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));
    fireEvent.press(await findByText('View bank account'));

    expect(mockNavigate).toHaveBeenCalledWith('RampVbaAccount');
  });
});
