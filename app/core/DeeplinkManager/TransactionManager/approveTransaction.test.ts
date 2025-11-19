/* eslint-disable import/no-namespace */
import * as AddressUtilsModule from '../../../util/address';
import * as NetworksUtilsModule from '../../../util/networks';
import * as TransactionsUtilsModule from '../../../util/transactions';
import Engine from '../../Engine';
import NotificationManager from '../../NotificationManager';
import approveTransaction from './approveTransaction';
import { addTransaction } from '../../../util/transaction-controller';
import { createMockInternalAccount } from '../../../util/test/accountsControllerTestUtils';
import { toHex } from '@metamask/controller-utils';
import { validateWithPPOM } from '../../../components/Views/confirmations/utils/deeplink';

const MOCK_SENDER_ADDRESS = '0xMockSenderAddress';
const MOCK_TARGET_ADDRESS = '0xTargetAddress';

const MOCK_INTERNAL_ACCOUNT = createMockInternalAccount(
  MOCK_SENDER_ADDRESS,
  'Account 1',
);

jest.mock('../../../util/networks');
jest.mock('../../../util/transactions');
jest.mock('../../../util/address');
jest.mock('../../Engine', () => ({
  context: {
    NetworkController: {
      setProviderType: jest.fn(),
      findNetworkClientIdByChainId: jest.fn(),
    },
    PreferencesController: {
      state: { selectedAddress: MOCK_SENDER_ADDRESS },
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
    AccountsController: {
      internalAccounts: MOCK_INTERNAL_ACCOUNT,
      getSelectedAccount: jest.fn(() => MOCK_INTERNAL_ACCOUNT),
    },
  },
}));
jest.mock('../../NotificationManager');
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key) => key),
}));
jest.mock('../../../util/transaction-controller', () => ({
  __esModule: true,
  addTransaction: jest.fn(),
}));
jest.mock('../../../components/Views/confirmations/utils/deeplink');

const mockEthUrl = {
  parameters: { uint256: '123', address: '0xMockAddress' },
  target_address: MOCK_TARGET_ADDRESS,
  chain_id: '1',
};
const mockDeeplinkManager = {
  navigation: {
    navigate: jest.fn(),
  },
};

const mockOrigin = 'testOrigin';

describe('approveTransaction', () => {
  const spyGetNetworkTypeById = jest.spyOn(
    NetworksUtilsModule,
    'getNetworkTypeById',
  );

  const spyGenerateApproveData = jest.spyOn(
    TransactionsUtilsModule,
    'generateApprovalData',
  );

  const spySetProviderType = jest.spyOn(
    Engine.context.NetworkController,
    'setProviderType',
  );

  const spyAddTransaction = addTransaction as jest.Mock;

  const spyGetAddress = jest.spyOn(AddressUtilsModule, 'getAddress');

  const spyShowSimpleNotification = jest.spyOn(
    NotificationManager,
    'showSimpleNotification',
  );

  const spyValidateWithPPOM = validateWithPPOM as jest.Mock;

  const spyFindNetworkClientIdByChainId = jest.spyOn(
    Engine.context.NetworkController,
    'findNetworkClientIdByChainId',
  );

  beforeEach(() => {
    jest.clearAllMocks();

    spyGetNetworkTypeById.mockReturnValue('fakeNetworkType');
    spyGenerateApproveData.mockReturnValue('fakeApproveData');
    spyFindNetworkClientIdByChainId.mockReturnValue('mockNetworkClientId');
  });

  it('should call setProviderType with the correct network type', async () => {
    const fakeNetworkType = 'fakeNetworkType';

    spyGetNetworkTypeById.mockReturnValue(fakeNetworkType);

    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(
      Engine.context.NetworkController.setProviderType,
    ).toHaveBeenCalledWith(fakeNetworkType);
  });

  it('calls generateApprovalData with the correct parameters', async () => {
    spyGetAddress.mockResolvedValue('0xMockAddress');

    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyGenerateApproveData).toHaveBeenCalledWith({
      spender: '0xMockAddress',
      value: '7b',
    });
  });

  it('should call addTransaction with the correct parameters', async () => {
    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyAddTransaction).toHaveBeenCalledWith(
      {
        to: MOCK_TARGET_ADDRESS,
        from: MOCK_SENDER_ADDRESS,
        value: '0x0',
        data: 'fakeApproveData',
      },
      {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mockNetworkClientId',
        origin: mockOrigin,
        securityAlertResponse: undefined,
      },
    );
  });

  it('should call getAddress with the correct parameters', async () => {
    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyGetAddress).toHaveBeenCalledWith(
      mockEthUrl.parameters?.address as string,
      toHex(mockEthUrl.chain_id),
    );
  });

  it('should call showSimpleNotification with the correct parameters if the spender address is invalid', async () => {
    spyGetAddress.mockResolvedValue('');

    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyShowSimpleNotification).toHaveBeenCalledWith({
      status: 'simple_notification_rejected',
      duration: 5000,
      title: 'transaction.invalid_recipient',
      description: 'transaction.invalid_recipient_description',
    });
  });

  it('should call navigate with the correct parameters if the spender address is invalid', async () => {
    spyGetAddress.mockResolvedValue('');

    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(mockDeeplinkManager.navigation.navigate).toHaveBeenCalledWith(
      'WalletView',
    );
  });

  it('should not call showSimpleNotification if the spender address is valid', async () => {
    spyGetAddress.mockResolvedValue('0xMockAddress');

    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyShowSimpleNotification).not.toHaveBeenCalled();
  });

  it('should not call navigate if the spender address is valid', async () => {
    spyGetAddress.mockResolvedValue('0xMockAddress');

    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(mockDeeplinkManager.navigation.navigate).not.toHaveBeenCalled();
  });

  it('should throw an error if the uint256 parameter is not a number', async () => {
    const mockEthUrlWithInvalidUint256 = {
      ...mockEthUrl,
      parameters: { uint256: 'invalidUint256', address: '0xMockAddress' },
    };

    await expect(
      approveTransaction({
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deeplinkManager: mockDeeplinkManager as any,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ethUrl: mockEthUrlWithInvalidUint256 as any,
        origin: mockOrigin,
      }),
    ).rejects.toThrow('The parameter uint256 should be a number');
  });

  it('should throw an error if the uint256 parameter is not an integer', async () => {
    const mockEthUrlWithInvalidUint256 = {
      ...mockEthUrl,
      parameters: { uint256: '1.23', address: '0xMockAddress' },
    };

    await expect(
      approveTransaction({
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deeplinkManager: mockDeeplinkManager as any,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ethUrl: mockEthUrlWithInvalidUint256 as any,
        origin: mockOrigin,
      }),
    ).rejects.toThrow('The parameter uint256 should be an integer');
  });

  it('should spySetProviderType with the correct network type', async () => {
    const mockEthUrlWithInvalidChainId = {
      ...mockEthUrl,
      chain_id: 'invalidChainId',
    };

    const fakeNetworkType = 'fakeNetworkType';

    spyGetNetworkTypeById.mockReturnValue(fakeNetworkType);

    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrlWithInvalidChainId as any,
      origin: mockOrigin,
    });

    expect(spySetProviderType).toHaveBeenCalledWith(fakeNetworkType);
  });

  it('calls validateWithPPOM with the correct parameters', async () => {
    spyGetAddress.mockResolvedValue('0xMockAddress');

    await approveTransaction({
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deeplinkManager: mockDeeplinkManager as any,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyValidateWithPPOM).toHaveBeenCalledWith({
      txParams: {
        to: MOCK_TARGET_ADDRESS,
        from: MOCK_SENDER_ADDRESS,
        value: '0x0',
        data: 'fakeApproveData',
      },
      origin: mockOrigin,
      chainId: toHex(mockEthUrl.chain_id),
      networkClientId: 'mockNetworkClientId',
    });
  });
});
