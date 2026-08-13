import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { getSessionProfileId } from '../../../../../util/notifications/utils/get-session-profile-id';
import MockKycSuccess from './MockKycSuccess';
import { MockKycSuccessSelectorsIDs } from './MockKycSuccess.testIds';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';
import { resetMoneyAccountProvisioning } from './moneyAccountProvisioning';

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
    KycController: { refreshKycStatus: jest.fn() },
    NeoBankService: { getCustomerByExternalId: jest.fn() },
    RampsController: {
      registerMoneyAccountWallet: jest.fn(),
      createAutoramp: jest.fn(),
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

const mockKycController = Engine.context.KycController as unknown as {
  refreshKycStatus: jest.Mock;
};

const mockNeoBankService = Engine.context.NeoBankService as unknown as {
  getCustomerByExternalId: jest.Mock;
};

const mockRampsController = Engine.context.RampsController as unknown as {
  registerMoneyAccountWallet: jest.Mock;
  createAutoramp: jest.Mock;
};

const setUp = () => {
  jest.clearAllMocks();
  resetMoneyAccountProvisioning();
  jest.mocked(getSessionProfileId).mockResolvedValue('profile-1');
  mockNeoBankService.getCustomerByExternalId.mockResolvedValue({
    id: 'cus_1',
    status: 'Active',
  });
  mockKycController.refreshKycStatus.mockResolvedValue({
    status: 'completed',
    sumsubSessionId: null,
    errorCode: null,
  });
  mockRampsController.registerMoneyAccountWallet.mockResolvedValue({
    type: 'registered',
  });
  mockRampsController.createAutoramp.mockResolvedValue({
    id: 'autoramp-1',
    status: 'created',
  });
};

describe('MockKycSuccess', () => {
  it('navigates back when the header back button is pressed', () => {
    setUp();
    const { getByTestId } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('registers the wallet then creates the autoramp when the pulled status is completed', async () => {
    setUp();
    const { getByTestId } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));

    await waitFor(() => {
      expect(mockRampsController.createAutoramp).toHaveBeenCalledWith(
        buildMoneyAccountAutorampParams(WALLET_ADDRESS),
      );
    });
    expect(mockKycController.refreshKycStatus).toHaveBeenCalled();
    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledWith({
      address: WALLET_ADDRESS,
    });
  });

  it('stops before the autoramp when the pulled status is not completed', async () => {
    setUp();
    mockKycController.refreshKycStatus.mockResolvedValue({
      status: 'pending',
      sumsubSessionId: null,
      errorCode: null,
    });
    const { getByTestId, findByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));

    expect(await findByText(/KYC status is "pending"/u)).toBeOnTheScreen();
    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).not.toHaveBeenCalled();
    expect(mockRampsController.createAutoramp).not.toHaveBeenCalled();
  });

  it('reuses the provisioned wallet and autoramp when the pipeline is re-run', async () => {
    setUp();
    const { getByTestId, findByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));
    await findByText('View bank account');
    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));
    await waitFor(() => {
      expect(mockKycController.refreshKycStatus).toHaveBeenCalledTimes(2);
    });

    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledTimes(
      1,
    );
    expect(mockRampsController.createAutoramp).toHaveBeenCalledTimes(1);
  });

  it('navigates to the bank account once the autoramp exists', async () => {
    setUp();
    const { getByTestId, findByText } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));
    fireEvent.press(await findByText('View bank account'));

    expect(mockNavigate).toHaveBeenCalledWith('RampVbaAccount');
  });
});
