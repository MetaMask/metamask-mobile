import { TransactionType } from '@metamask/transaction-controller';

import { ETH_ACTIONS } from '../../../../constants/deeplinks';
import { selectConfirmationRedesignFlagsFromRemoteFeatureFlags } from '../../../../selectors/featureFlagController/confirmations';
import Engine from '../../../../core/Engine';
import { generateTransferData } from '../../../../util/transactions';

import {
  addTransactionForDeeplink,
  isDeeplinkRedesignedConfirmationCompatible,
  type DeeplinkRequest,
} from './deeplink';

const ORIGIN_MOCK = 'example.test-dapp.com';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RemoteFeatureFlagController: {
      state: {
        remoteFeatureFlags: {},
      },
    },
    AccountsController: {
      getSelectedAccount: jest.fn(),
    },
    NetworkController: {
      state: {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId: {
          '0x1': {
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: 'mainnet' }],
          },
          '0x22': {
            defaultRpcEndpointIndex: 0,
            rpcEndpoints: [{ networkClientId: 'another-network' }],
          },
        },
      },
      findNetworkClientIdByChainId: jest.fn(),
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
  },
}));

jest.mock('../../../../selectors/featureFlagController/confirmations', () => ({
  selectConfirmationRedesignFlagsFromRemoteFeatureFlags: jest.fn(),
}));

jest.mock('../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
}));

describe('isDeeplinkRedesignedConfirmationCompatible', () => {
  const enabledTransferFlags = {
    approve: false,
    transfer: true,
    signatures: true,
    contract_deployment: false,
    staking_confirmations: false,
    contract_interaction: false,
  };

  const disabledTransferFlags = {
    ...enabledTransferFlags,
    transfer: false,
  };

  const mockSelectConfirmationRedesignFlagsFromRemoteFeatureFlags = jest.mocked(
    selectConfirmationRedesignFlagsFromRemoteFeatureFlags,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectConfirmationRedesignFlagsFromRemoteFeatureFlags.mockReturnValue(
      enabledTransferFlags,
    );
  });

  it('returns feature flag value for ETH_ACTIONS.TRANSFER', () => {
    const result = isDeeplinkRedesignedConfirmationCompatible(
      ETH_ACTIONS.TRANSFER,
    );
    expect(result).toBe(true);

    mockSelectConfirmationRedesignFlagsFromRemoteFeatureFlags.mockReturnValue(
      disabledTransferFlags,
    );

    const disabledResult = isDeeplinkRedesignedConfirmationCompatible(
      ETH_ACTIONS.TRANSFER,
    );

    expect(disabledResult).toBe(false);
  });

  it('returns false for ETH_ACTIONS.APPROVE', () => {
    const result = isDeeplinkRedesignedConfirmationCompatible(
      ETH_ACTIONS.APPROVE,
    );
    expect(result).toBe(false);
  });

  it('defaults to true if function name is not provided', () => {
    const result = isDeeplinkRedesignedConfirmationCompatible();
    expect(result).toBe(true);

    mockSelectConfirmationRedesignFlagsFromRemoteFeatureFlags.mockReturnValue(
      disabledTransferFlags,
    );

    const disabledResult = isDeeplinkRedesignedConfirmationCompatible();

    expect(disabledResult).toBe(false);
  });
});

describe('addTransactionForDeeplink', () => {
  const TO_ADDRESS_MOCK = '0x6D404AfE1a6A07Aa3CbcBf9Fd027671Df628ebFc';
  const FROM_ADDRESS_MOCK = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';

  const mockEngine = jest.mocked(Engine);
  const mockGenerateTransferData = jest.mocked(generateTransferData);
  const mockGetSelectedAccount =
    mockEngine.context.AccountsController.getSelectedAccount;
  const mockAddTransaction =
    mockEngine.context.TransactionController.addTransaction;
  const mockFindNetworkClientIdByChainId =
    mockEngine.context.NetworkController.findNetworkClientIdByChainId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSelectedAccount.mockReturnValue({
      address: FROM_ADDRESS_MOCK,
    } as ReturnType<typeof Engine.context.AccountsController.getSelectedAccount>);
    mockFindNetworkClientIdByChainId.mockReturnValue('mainnet');
  });

  it('adds a native transfer transaction', async () => {
    mockFindNetworkClientIdByChainId.mockReturnValue('another-network');
    await addTransactionForDeeplink({
      chain_id: '0x22',
      parameters: {
        value: '1000',
      },
      target_address: TO_ADDRESS_MOCK,
      origin: ORIGIN_MOCK,
    } as unknown as DeeplinkRequest);

    expect(mockAddTransaction).toHaveBeenCalledWith(
      {
        from: FROM_ADDRESS_MOCK,
        to: TO_ADDRESS_MOCK,
        value: '0x3e8', // 1000 in hex
      },
      {
        networkClientId: 'another-network',
        origin: ORIGIN_MOCK,
        type: TransactionType.simpleSend,
      },
    );
  });

  it('adds a transaction to mainnet if chain_id is not provided', async () => {
    await addTransactionForDeeplink({
      parameters: {
        value: '1000',
      },
      target_address: TO_ADDRESS_MOCK,
      origin: ORIGIN_MOCK,
    } as unknown as DeeplinkRequest);

    expect(mockAddTransaction).toHaveBeenCalledWith(
      {
        from: FROM_ADDRESS_MOCK,
        to: TO_ADDRESS_MOCK,
        value: '0x3e8', // 1000 in hex
      },
      {
        networkClientId: 'mainnet',
        origin: ORIGIN_MOCK,
        type: TransactionType.simpleSend,
      },
    );
  });

  it('does not call addTransaction if it is already processing another transaction', async () => {
    // Not awaiting the first call to addTransactionForDeeplink to test the flow
    addTransactionForDeeplink({
      parameters: {
        value: '1000',
      },
      target_address: TO_ADDRESS_MOCK,
      origin: ORIGIN_MOCK,
    } as unknown as DeeplinkRequest);

    expect(mockAddTransaction).toHaveBeenCalledTimes(1);

    addTransactionForDeeplink({
      parameters: {
        value: '9999',
      },
      target_address: TO_ADDRESS_MOCK,
      origin: ORIGIN_MOCK,
    } as unknown as DeeplinkRequest);

    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('adds an ERC20 transfer transaction', async () => {
    const mockGeneratedDataForTransfer = 'generated-data-for-transfer';

    mockGenerateTransferData.mockReturnValue(mockGeneratedDataForTransfer);

    const ERC20_ADDRESS_MOCK = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
    await addTransactionForDeeplink({
      function_name: 'transfer',
      parameters: {
        address: TO_ADDRESS_MOCK,
        uint256: '1000',
      },
      target_address: ERC20_ADDRESS_MOCK,
      origin: ORIGIN_MOCK,
    } as unknown as DeeplinkRequest);

    expect(mockGenerateTransferData).toHaveBeenCalledWith(
      'transfer',
      expect.objectContaining({
        toAddress: TO_ADDRESS_MOCK,
        amount: '0x3e8', // 1000 in hex
      }),
    );

    expect(mockAddTransaction).toHaveBeenCalledWith(
      {
        from: FROM_ADDRESS_MOCK,
        to: ERC20_ADDRESS_MOCK,
        data: mockGeneratedDataForTransfer,
      },
      {
        networkClientId: 'mainnet',
        origin: ORIGIN_MOCK,
        type: TransactionType.tokenMethodTransfer,
      },
    );
  });
});
