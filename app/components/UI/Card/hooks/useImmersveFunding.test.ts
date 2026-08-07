import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { awaitTransactionConfirmed } from '../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import { useImmersveFunding } from './useImmersveFunding';
import type { CardSmartContractWriteParams } from '../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      createFundingSource: jest.fn(),
      createCard: jest.fn(),
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
  },
  controllerMessenger: {},
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

jest.mock('react-redux', () => ({
  useSelector: (fn: () => unknown) => fn(),
}));

const MOCK_ACCOUNT_ADDRESS = '0x1111111111111111111111111111111111111111';

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: '0x1111111111111111111111111111111111111111',
  })),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardFeatureFlag: () => ({ immersve: { network: 'base-sepolia' } }),
}));

jest.mock('./useEnsureCardNetworkExists', () => ({
  useEnsureCardNetworkExists: () => ({
    ensureNetworkExists: jest.fn().mockResolvedValue('network-client-1'),
  }),
}));

jest.mock(
  '../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed',
  () => ({
    awaitTransactionConfirmed: jest.fn(),
  }),
);

const mockCard = Engine.context.CardController as jest.Mocked<
  typeof Engine.context.CardController
>;
const mockTx = Engine.context.TransactionController as jest.Mocked<
  typeof Engine.context.TransactionController
>;
const mockAwait = awaitTransactionConfirmed as jest.Mock;
const accountsModule = jest.requireMock(
  '../../../../selectors/multichainAccounts/accounts',
) as {
  selectSelectedInternalAccountByScope: jest.Mock;
};

const APPROVE_WRITE: CardSmartContractWriteParams = {
  abi: [
    {
      name: 'approve',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: '_spender', type: 'address' },
        { name: '_value', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
  ],
  contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  method: 'approve',
  params: {
    _spender: '0x2222222222222222222222222222222222222222',
    _value: '1000000',
  },
};

describe('useImmersveFunding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    accountsModule.selectSelectedInternalAccountByScope.mockImplementation(
      () => () => ({
        address: MOCK_ACCOUNT_ADDRESS,
      }),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('createFundingSource delegates to the controller', async () => {
    (mockCard.createFundingSource as jest.Mock).mockResolvedValue({
      id: 'fs-1',
    });

    const { result } = renderHook(() => useImmersveFunding());

    let fs;
    await act(async () => {
      fs = await result.current.createFundingSource();
    });

    expect(mockCard.createFundingSource).toHaveBeenCalledTimes(1);
    expect(fs).toStrictEqual({ id: 'fs-1' });
  });

  it('createCard delegates to the controller with the funding source id', async () => {
    (mockCard.createCard as jest.Mock).mockResolvedValue({ cardId: 'card-1' });

    const { result } = renderHook(() => useImmersveFunding());

    let card;
    await act(async () => {
      card = await result.current.createCard('fs-1');
    });

    expect(mockCard.createCard).toHaveBeenCalledWith('fs-1');
    expect(card).toStrictEqual({ cardId: 'card-1' });
  });

  it('executeFunding submits the encoded write on Base and returns the tx hash', async () => {
    mockAwait.mockImplementation(async ({ submit }) => {
      await submit();
      return { txHash: '0xtxhash', transactionMeta: {} };
    });
    (mockTx.addTransaction as jest.Mock).mockResolvedValue({
      result: Promise.resolve('0xtxhash'),
      transactionMeta: {},
    });

    const { result } = renderHook(() => useImmersveFunding());

    let txHash;
    await act(async () => {
      txHash = await result.current.executeFunding(APPROVE_WRITE);
    });

    expect(mockTx.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        to: APPROVE_WRITE.contractAddress,
        data: expect.stringMatching(/^0x/),
      }),
      expect.objectContaining({ networkClientId: 'network-client-1' }),
    );
    expect(txHash).toBe('0xtxhash');
    expect(result.current.error).toBeNull();
  });

  it('executeFunding surfaces an error when no account is selected', async () => {
    accountsModule.selectSelectedInternalAccountByScope.mockImplementationOnce(
      () => () => undefined,
    );

    const { result } = renderHook(() => useImmersveFunding());

    await act(async () => {
      await expect(
        result.current.executeFunding(APPROVE_WRITE),
      ).rejects.toThrow();
    });

    expect(mockTx.addTransaction).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
  });
});
