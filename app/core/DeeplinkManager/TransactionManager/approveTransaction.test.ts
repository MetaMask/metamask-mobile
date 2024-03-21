/* eslint-disable import/no-namespace */
import * as AddressUtilsModule from '../../../util/address';
import * as NetworksUtilsModule from '../../../util/networks';
import * as TransactionsUtilsModule from '../../../util/transactions';
import Engine from '../../Engine';
import NotificationManager from '../../NotificationManager';
import approveTransaction from './approveTransaction';
import { addTransaction } from '../../../util/transaction-controller';

jest.mock('../../../util/networks');
jest.mock('../../../util/transactions');
jest.mock('../../../util/address');
jest.mock('../../Engine');
jest.mock('../../NotificationManager');
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key) => key),
}));
jest.mock('../../../util/transaction-controller', () => ({
  __esModule: true,
  addTransaction: jest.fn(),
}));

const mockEthUrl = {
  parameters: { uint256: '123', address: '0xMockAddress' },
  target_address: '0xTargetAddress',
  chain_id: '1',
};
const mockDeeplinkManager = {
  navigation: {
    navigate: jest.fn(),
  },
};

const mockOrigin = 'testOrigin';

Engine.context.TransactionController = { addTransaction: jest.fn() };
Engine.context.PreferencesController = {
  state: { selectedAddress: '0xMockSenderAddress' },
};
Engine.context.NetworkController = { setProviderType: jest.fn() };

describe('approveTransaction', () => {
  const spyGetNetworkTypeById = jest.spyOn(
    NetworksUtilsModule,
    'getNetworkTypeById',
  );

  const spyGenerateApproveData = jest.spyOn(
    TransactionsUtilsModule,
    'generateApproveData',
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

  beforeEach(() => {
    jest.clearAllMocks();

    spyGetNetworkTypeById.mockReturnValue('fakeNetworkType');
    spyGenerateApproveData.mockReturnValue('fakeApproveData');
  });

  it('should call setProviderType with the correct network type', async () => {
    const fakeNetworkType = 'fakeNetworkType';

    spyGetNetworkTypeById.mockReturnValue(fakeNetworkType);

    await approveTransaction({
      deeplinkManager: mockDeeplinkManager as any,
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(
      Engine.context.NetworkController.setProviderType,
    ).toHaveBeenCalledWith(fakeNetworkType);
  });

  it('should call generateApproveData with the correct parameters', async () => {
    spyGetAddress.mockReturnValue('0xMockAddress');

    await approveTransaction({
      deeplinkManager: mockDeeplinkManager as any,
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
      deeplinkManager: mockDeeplinkManager as any,
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyAddTransaction).toHaveBeenCalledWith(
      {
        to: '0xTargetAddress',
        from: '0xMockSenderAddress',
        value: '0x0',
        data: 'fakeApproveData',
      },
      {
        deviceConfirmedOn: 'metamask_mobile',
        origin: mockOrigin,
      },
    );
  });

  it('should call getAddress with the correct parameters', async () => {
    await approveTransaction({
      deeplinkManager: mockDeeplinkManager as any,
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyGetAddress).toHaveBeenCalledWith(
      mockEthUrl.parameters?.address as string,
      mockEthUrl.chain_id,
    );
  });

  it('should call showSimpleNotification with the correct parameters if the spender address is invalid', async () => {
    spyGetAddress.mockReturnValue('');

    await approveTransaction({
      deeplinkManager: mockDeeplinkManager as any,
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
    spyGetAddress.mockReturnValue('');

    await approveTransaction({
      deeplinkManager: mockDeeplinkManager as any,
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(mockDeeplinkManager.navigation.navigate).toHaveBeenCalledWith(
      'WalletView',
    );
  });

  it('should not call showSimpleNotification if the spender address is valid', async () => {
    spyGetAddress.mockReturnValue('0xMockAddress');

    await approveTransaction({
      deeplinkManager: mockDeeplinkManager as any,
      ethUrl: mockEthUrl as any,
      origin: mockOrigin,
    });

    expect(spyShowSimpleNotification).not.toHaveBeenCalled();
  });

  it('should not call navigate if the spender address is valid', async () => {
    spyGetAddress.mockReturnValue('0xMockAddress');

    await approveTransaction({
      deeplinkManager: mockDeeplinkManager as any,
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
        deeplinkManager: mockDeeplinkManager as any,
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
        deeplinkManager: mockDeeplinkManager as any,
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
      deeplinkManager: mockDeeplinkManager as any,
      ethUrl: mockEthUrlWithInvalidChainId as any,
      origin: mockOrigin,
    });

    expect(spySetProviderType).toHaveBeenCalledWith(fakeNetworkType);
  });
});
