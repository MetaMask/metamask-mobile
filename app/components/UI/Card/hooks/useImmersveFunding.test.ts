import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { awaitTransactionConfirmed } from '../../../../core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
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
    AccountsController: {
      getAccountByAddress: jest.fn((address: string) => ({
        address,
        id: `account-${address}`,
      })),
    },
  },
  controllerMessenger: {},
  setSelectedAddress: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: (fn: (state?: unknown) => unknown) => fn(),
}));

const MOCK_ACCOUNT_ADDRESS = '0x1111111111111111111111111111111111111111';
const FUNDING_ACCOUNT_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const FUNDING_ACCOUNT_CHECKSUM = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa';

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: '0x1111111111111111111111111111111111111111',
  })),
}));

jest.mock('../../../../selectors/cardController', () => ({
  selectCardHomeData: jest.fn(() => null),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardImmersveConfig: jest.fn(() => ({
    network: 'base-sepolia',
    spenderAddress: '0x2222222222222222222222222222222222222222',
  })),
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
const cardControllerSelectors = jest.requireMock(
  '../../../../selectors/cardController',
) as {
  selectCardHomeData: jest.Mock;
};
const cardFeatureFlagsModule = jest.requireMock(
  '../../../../selectors/featureFlagController/card',
) as {
  selectCardImmersveConfig: jest.Mock;
};

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties.mockReturnValue({ build: mockBuild }),
}));

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
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    accountsModule.selectSelectedInternalAccountByScope.mockImplementation(
      () => () => ({
        address: MOCK_ACCOUNT_ADDRESS,
      }),
    );
    cardControllerSelectors.selectCardHomeData.mockReturnValue(null);
    cardFeatureFlagsModule.selectCardImmersveConfig.mockReturnValue({
      network: 'base-sepolia',
      spenderAddress: '0x2222222222222222222222222222222222222222',
    });
    (
      Engine.context.AccountsController.getAccountByAddress as jest.Mock
    ).mockImplementation((address: string) => ({
      address,
      id: `account-${address}`,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_FUNDING_PROCESS_STARTED,
    );
    expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_FUNDING_PROCESS_COMPLETED,
    );
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
        from: MOCK_ACCOUNT_ADDRESS,
        to: APPROVE_WRITE.contractAddress,
        data: expect.stringMatching(/^0x/),
      }),
      expect.objectContaining({ networkClientId: 'network-client-1' }),
    );
    expect(txHash).toBe('0xtxhash');
    expect(result.current.error).toBeNull();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_FUNDING_PROCESS_STARTED,
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_FUNDING_PROCESS_COMPLETED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'immersve', step: 'approve' }),
    );
  });

  it('executeFunding overrides the approve amount when provided', async () => {
    const { ethers } = jest.requireActual('ethers');
    mockAwait.mockImplementation(async ({ submit }) => {
      await submit();
      return { txHash: '0xtxhash', transactionMeta: {} };
    });
    (mockTx.addTransaction as jest.Mock).mockResolvedValue({
      result: Promise.resolve('0xtxhash'),
      transactionMeta: {},
    });

    const { result } = renderHook(() => useImmersveFunding());

    await act(async () => {
      await result.current.executeFunding(APPROVE_WRITE, '5000000');
    });

    const expectedData = new ethers.utils.Interface(
      APPROVE_WRITE.abi,
    ).encodeFunctionData('approve', [APPROVE_WRITE.params._spender, '5000000']);

    expect(mockTx.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        to: APPROVE_WRITE.contractAddress,
        data: expectedData,
      }),
      expect.any(Object),
    );
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
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          data: expect.objectContaining({
            method: 'executeFunding',
            step: 'approve',
            network: 'base-sepolia',
          }),
        }),
      }),
    );
  });

  it('executeFunding submits from the Card Home funding wallet when selection differs', async () => {
    cardControllerSelectors.selectCardHomeData.mockReturnValue({
      primaryFundingAsset: { walletAddress: FUNDING_ACCOUNT_ADDRESS },
    });
    mockAwait.mockImplementation(async ({ submit }) => {
      await submit();
      return { txHash: '0xtxhash', transactionMeta: {} };
    });
    (mockTx.addTransaction as jest.Mock).mockResolvedValue({
      result: Promise.resolve('0xtxhash'),
      transactionMeta: {},
    });

    const { result } = renderHook(() => useImmersveFunding());

    await act(async () => {
      await result.current.executeFunding(APPROVE_WRITE);
    });

    expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
      FUNDING_ACCOUNT_CHECKSUM,
    );
    expect(mockTx.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        from: FUNDING_ACCOUNT_CHECKSUM,
      }),
      expect.any(Object),
    );
  });

  it('revokeFunding submits from an explicit fundingAddress over the selected account', async () => {
    mockAwait.mockImplementation(async ({ submit }) => {
      await submit();
      return { txHash: '0xrevokehash', transactionMeta: {} };
    });
    (mockTx.addTransaction as jest.Mock).mockResolvedValue({
      result: Promise.resolve('0xrevokehash'),
      transactionMeta: {},
    });

    const { result } = renderHook(() =>
      useImmersveFunding({ fundingAddress: FUNDING_ACCOUNT_ADDRESS }),
    );

    await act(async () => {
      await result.current.revokeFunding();
    });

    expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
      FUNDING_ACCOUNT_CHECKSUM,
    );
    expect(mockTx.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        from: FUNDING_ACCOUNT_CHECKSUM,
      }),
      expect.any(Object),
    );
  });

  it('executeFunding clears loading when network config is unsupported', async () => {
    cardFeatureFlagsModule.selectCardImmersveConfig.mockReturnValue({
      network: 'not-a-network',
      spenderAddress: '0x2222222222222222222222222222222222222222',
    });

    const { result } = renderHook(() => useImmersveFunding());

    await act(async () => {
      await expect(
        result.current.executeFunding(APPROVE_WRITE),
      ).rejects.toThrow(/Unsupported Immersve funding network/);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          data: expect.objectContaining({
            method: 'executeFunding',
            network: 'not-a-network',
          }),
        }),
      }),
    );
  });

  it('revokeFunding encodes approve(spender, 0) and submits the tx', async () => {
    const { ethers } = jest.requireActual('ethers');
    const { BASE_SEPOLIA_USDC_TOKEN_ADDRESS } =
      jest.requireActual('../constants');
    mockAwait.mockImplementation(async ({ submit }) => {
      await submit();
      return { txHash: '0xrevokehash', transactionMeta: {} };
    });
    (mockTx.addTransaction as jest.Mock).mockResolvedValue({
      result: Promise.resolve('0xrevokehash'),
      transactionMeta: {},
    });

    const { result } = renderHook(() => useImmersveFunding());

    let txHash;
    await act(async () => {
      txHash = await result.current.revokeFunding();
    });

    const expectedData = new ethers.utils.Interface([
      'function approve(address _spender, uint256 _value) returns (bool)',
    ]).encodeFunctionData('approve', [
      '0x2222222222222222222222222222222222222222',
      '0',
    ]);

    expect(mockTx.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        to: BASE_SEPOLIA_USDC_TOKEN_ADDRESS,
        data: expectedData,
      }),
      expect.objectContaining({
        networkClientId: 'network-client-1',
        type: 'approve',
      }),
    );
    expect(txHash).toBe('0xrevokehash');
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'immersve',
        step: 'revoke',
        is_revoke: true,
      }),
    );
  });

  it('revokeFunding throws when spenderAddress is unset', async () => {
    cardFeatureFlagsModule.selectCardImmersveConfig.mockReturnValue({
      network: 'base-sepolia',
      spenderAddress: '',
    });

    const { result } = renderHook(() => useImmersveFunding());

    await act(async () => {
      await expect(result.current.revokeFunding()).rejects.toThrow(
        /spender address is not configured/,
      );
    });

    expect(mockTx.addTransaction).not.toHaveBeenCalled();
  });

  it('buildApproveWrite returns an approve write for the configured spender', () => {
    const { BASE_SEPOLIA_USDC_TOKEN_ADDRESS, BAANX_MAX_LIMIT } =
      jest.requireActual('../constants');

    const { result } = renderHook(() => useImmersveFunding());

    const write = result.current.buildApproveWrite(BAANX_MAX_LIMIT);

    expect(write).toEqual({
      abi: expect.any(Array),
      contractAddress: BASE_SEPOLIA_USDC_TOKEN_ADDRESS,
      method: 'approve',
      params: {
        _spender: '0x2222222222222222222222222222222222222222',
        _value: BAANX_MAX_LIMIT,
      },
    });
    expect(mockTx.addTransaction).not.toHaveBeenCalled();
  });

  it('buildApproveWrite throws when spenderAddress is unset', () => {
    cardFeatureFlagsModule.selectCardImmersveConfig.mockReturnValue({
      network: 'base-sepolia',
      spenderAddress: '',
    });

    const { result } = renderHook(() => useImmersveFunding());

    expect(() => result.current.buildApproveWrite('0')).toThrow(
      /spender address is not configured/,
    );
    expect(mockTx.addTransaction).not.toHaveBeenCalled();
  });

  it('revokeFunding maps user cancel to UserCancelledError', async () => {
    mockAwait.mockRejectedValue(new Error('User rejected the request'));

    const { result } = renderHook(() => useImmersveFunding());

    await act(async () => {
      await expect(result.current.revokeFunding()).rejects.toThrow(
        'User rejected the request',
      );
    });

    expect(result.current.error).toBeNull();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_FUNDING_PROCESS_USER_CANCELED,
    );
  });
});
