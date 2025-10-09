import { Interface } from 'ethers/lib/utils';
import Engine from '../../../../../../core/Engine';
import { MATIC_CONTRACTS, POLYGON_MAINNET_CHAIN_ID } from '../constants';
import { SAFE_FACTORY_ADDRESS, SAFE_MULTISEND_ADDRESS } from './constants';
import {
  computeSafeAddress,
  createSafeFeeAuthorization,
  getDeployProxyWalletTypedData,
  encodeCreateProxy,
  getDeployProxyWalletTransaction,
  checkProxyWalletDeployed,
  encodeMultisend,
  createSafeMultisendTransaction,
  aggregateTransaction,
  createAllowancesSafeTransaction,
  hasAllowances,
  createClaimSafeTransaction,
} from './utils';
import { OperationType } from './types';
import { Signer } from '../../types';
import { numberToHex } from '@metamask/utils';
import EthQuery from '@metamask/eth-query';
import { query } from '@metamask/controller-utils';
import { PredictPosition, PredictPositionStatus } from '../../../types';
import { isSmartContractAddress } from '../../../../../../util/transactions';
import { getAllowance, getIsApprovedForAll } from '../utils';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
      getNetworkClientById: jest.fn(),
    },
    KeyringController: {
      signPersonalMessage: jest.fn(),
    },
  },
}));

jest.mock('@metamask/controller-utils', () => ({
  query: jest.fn(),
}));

jest.mock('@metamask/eth-query');

jest.mock('../../../../../../util/transactions', () => ({
  isSmartContractAddress: jest.fn(),
}));

jest.mock('../utils', () => ({
  encodeApprove: jest.fn(() => '0x095ea7b3000000000000000000000000'),
  encodeErc1155Approve: jest.fn(() => '0xa22cb465000000000000000000000000'),
  encodeClaim: jest.fn(() => '0x4e71d92d000000000000000000000000'),
  getAllowance: jest.fn(),
  getIsApprovedForAll: jest.fn(),
  getContractConfig: jest.fn(() => ({
    conditionalTokens: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
    negRiskAdapter: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  })),
}));

const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.Mock;
const mockGetNetworkClientById = Engine.context.NetworkController
  .getNetworkClientById as jest.Mock;
const mockSignPersonalMessage = Engine.context.KeyringController
  .signPersonalMessage as jest.Mock;
const mockSignTypedMessage = jest.fn();
const mockQuery = query as jest.Mock;
const mockIsSmartContractAddress =
  isSmartContractAddress as jest.MockedFunction<typeof isSmartContractAddress>;
const mockGetAllowance = getAllowance as jest.MockedFunction<
  typeof getAllowance
>;
const mockGetIsApprovedForAll = getIsApprovedForAll as jest.MockedFunction<
  typeof getIsApprovedForAll
>;

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const TEST_SAFE_ADDRESS = '0x9999999999999999999999999999999999999999' as const;
const TEST_TO_ADDRESS = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382' as const;

function buildSigner({
  address = TEST_ADDRESS,
  signPersonalMessage = mockSignPersonalMessage,
  signTypedMessage = mockSignTypedMessage,
}: Partial<Signer> = {}): Signer {
  return {
    address,
    signPersonalMessage,
    signTypedMessage,
  };
}

function mockNetworkController() {
  const mockProvider = {};
  mockFindNetworkClientIdByChainId.mockReturnValue('polygon');
  mockGetNetworkClientById.mockReturnValue({
    provider: mockProvider,
  });
  return mockProvider;
}

function setupMocksForFeeAuth() {
  mockNetworkController();
  mockQuery
    .mockResolvedValueOnce(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    )
    .mockResolvedValueOnce(
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    );
  mockSignPersonalMessage.mockResolvedValue(
    '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
  );
}

describe('safe utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('computeSafeAddress', () => {
    it('computes Safe address from signer address', async () => {
      const signer = buildSigner();
      mockNetworkController();
      mockQuery.mockResolvedValue(
        '0x0000000000000000000000009999999999999999999999999999999999999999',
      );

      const safeAddress = await computeSafeAddress(signer.address);

      expect(safeAddress).toBe(TEST_SAFE_ADDRESS);
    });

    it('calls Safe Factory computeProxyAddress function', async () => {
      const signer = buildSigner({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      });
      mockNetworkController();
      mockQuery.mockResolvedValue(
        '0x0000000000000000000000001111111111111111111111111111111111111111',
      );

      await computeSafeAddress(signer.address);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(EthQuery), 'call', [
        {
          to: SAFE_FACTORY_ADDRESS,
          data: expect.stringContaining('0x'),
        },
      ]);

      const callData = mockQuery.mock.calls[0][2][0].data;
      expect(callData).toContain(signer.address.slice(2).toLowerCase());
    });

    it('returns properly formatted address', async () => {
      const signer = buildSigner();
      mockNetworkController();
      mockQuery.mockResolvedValue(
        '0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );

      const safeAddress = await computeSafeAddress(signer.address);

      expect(safeAddress).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it('uses Polygon network', async () => {
      const signer = buildSigner();
      mockNetworkController();
      mockQuery.mockResolvedValue(
        '0x0000000000000000000000009999999999999999999999999999999999999999',
      );

      await computeSafeAddress(signer.address);

      expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledWith(
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
      );
      expect(mockGetNetworkClientById).toHaveBeenCalledWith('polygon');
    });
  });

  describe('createSafeFeeAuthorization', () => {
    const testParams = {
      signer: buildSigner(),
      safeAddress: TEST_SAFE_ADDRESS,
      amount: BigInt(1000000),
      to: TEST_TO_ADDRESS,
    };

    it('creates fee authorization with correct structure', async () => {
      setupMocksForFeeAuth();

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth).toHaveProperty('type', 'safe-transaction');
      expect(feeAuth).toHaveProperty('authorization');
      expect(feeAuth.authorization).toHaveProperty('tx');
      expect(feeAuth.authorization).toHaveProperty('sig');
    });

    it('encodes ERC20 transfer correctly', async () => {
      setupMocksForFeeAuth();

      const feeAuth = await createSafeFeeAuthorization({
        ...testParams,
        amount: BigInt(500000),
      });

      const expectedTransferData = new Interface([
        'function transfer(address to, uint256 amount)',
      ]).encodeFunctionData('transfer', [TEST_TO_ADDRESS, BigInt(500000)]);
      expect(feeAuth.authorization.tx.data).toBe(expectedTransferData);
    });

    it('sets operation type to Call', async () => {
      setupMocksForFeeAuth();

      const feeAuth = await createSafeFeeAuthorization({
        ...testParams,
        amount: BigInt(250000),
      });

      expect(feeAuth.authorization.tx.operation).toBe(OperationType.Call);
    });

    it('uses MATIC_CONTRACTS.collateral as token address', async () => {
      setupMocksForFeeAuth();

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth.authorization.tx.to).toBe(MATIC_CONTRACTS.collateral);
    });

    it('signs the Safe transaction', async () => {
      setupMocksForFeeAuth();

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(mockSignPersonalMessage).toHaveBeenCalled();
      expect(feeAuth.authorization.sig).toBeTruthy();
      expect(feeAuth.authorization.sig).toMatch(/^0x[a-f0-9]+$/);
    });

    it('returns SafeFeeAuthorization type', async () => {
      setupMocksForFeeAuth();

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth.authorization.tx.value).toBe('0');
      expect(typeof feeAuth.authorization.sig).toBe('string');
    });

    it('calls Safe contract for nonce', async () => {
      setupMocksForFeeAuth();

      await createSafeFeeAuthorization(testParams);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(EthQuery),
        'call',
        expect.arrayContaining([
          expect.objectContaining({
            to: TEST_SAFE_ADDRESS,
          }),
        ]),
      );
    });

    it('handles undeployed Safe contract (nonce returns 0x)', async () => {
      mockNetworkController();
      mockQuery
        .mockResolvedValueOnce('0x')
        .mockResolvedValueOnce(
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        );
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth).toHaveProperty('type', 'safe-transaction');
      expect(feeAuth.authorization.tx).toBeDefined();
    });

    it('calls Safe contract for transaction hash', async () => {
      setupMocksForFeeAuth();

      await createSafeFeeAuthorization(testParams);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const secondCallArgs = mockQuery.mock.calls[1];
      expect(secondCallArgs[2][0].to).toBe(TEST_SAFE_ADDRESS);
    });

    it('handles signature v value adjustment for 0 and 1', async () => {
      setupMocksForFeeAuth();
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth.authorization.sig).toBeTruthy();
      expect(feeAuth.authorization.sig).toMatch(/^0x[a-f0-9]+$/);
    });

    it('handles signature v value adjustment for 27 and 28', async () => {
      setupMocksForFeeAuth();
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889901b',
      );

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth.authorization.sig).toBeTruthy();
      expect(feeAuth.authorization.sig).toMatch(/^0x[a-f0-9]+$/);
    });

    it('throws error for invalid signature v value', async () => {
      setupMocksForFeeAuth();
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899ff',
      );

      await expect(createSafeFeeAuthorization(testParams)).rejects.toThrow(
        'Invalid signature',
      );
    });

    it('handles signature v value 0 correctly', async () => {
      setupMocksForFeeAuth();
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth).toHaveProperty('type', 'safe-transaction');
      expect(feeAuth).toHaveProperty('authorization');
      expect(feeAuth.authorization).toHaveProperty('tx');
      expect(feeAuth.authorization).toHaveProperty('sig');
      expect(feeAuth.authorization.sig).toMatch(/^0x[a-f0-9]+$/);
    });

    it('handles signature v value 1 correctly', async () => {
      setupMocksForFeeAuth();
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889901',
      );

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth).toHaveProperty('type', 'safe-transaction');
      expect(feeAuth).toHaveProperty('authorization');
      expect(feeAuth.authorization).toHaveProperty('tx');
      expect(feeAuth.authorization).toHaveProperty('sig');
      expect(feeAuth.authorization.sig).toMatch(/^0x[a-f0-9]+$/);
    });

    it('handles signature v value 27 correctly', async () => {
      setupMocksForFeeAuth();
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889901b',
      );

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth).toHaveProperty('type', 'safe-transaction');
      expect(feeAuth).toHaveProperty('authorization');
      expect(feeAuth.authorization).toHaveProperty('tx');
      expect(feeAuth.authorization).toHaveProperty('sig');
      expect(feeAuth.authorization.sig).toMatch(/^0x[a-f0-9]+$/);
    });

    it('handles signature v value 28 correctly', async () => {
      setupMocksForFeeAuth();
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889901c',
      );

      const feeAuth = await createSafeFeeAuthorization(testParams);

      expect(feeAuth).toHaveProperty('type', 'safe-transaction');
      expect(feeAuth).toHaveProperty('authorization');
      expect(feeAuth.authorization).toHaveProperty('tx');
      expect(feeAuth.authorization).toHaveProperty('sig');
      expect(feeAuth.authorization.sig).toMatch(/^0x[a-f0-9]+$/);
    });
  });

  describe('getDeployProxyWalletTypedData', () => {
    it('returns correct typed data structure', async () => {
      const typedData = await getDeployProxyWalletTypedData();

      expect(typedData).toHaveProperty('domain');
      expect(typedData).toHaveProperty('types');
      expect(typedData).toHaveProperty('message');
      expect(typedData).toHaveProperty('primaryType', 'CreateProxy');
    });

    it('uses correct domain values', async () => {
      const typedData = await getDeployProxyWalletTypedData();

      expect(typedData.domain.name).toBeDefined();
      expect(typedData.domain.chainId).toBe(
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
      );
      expect(typedData.domain.verifyingContract).toBe(SAFE_FACTORY_ADDRESS);
    });

    it('includes CreateProxy type definition', async () => {
      const typedData = await getDeployProxyWalletTypedData();

      expect(typedData.types.CreateProxy).toBeDefined();
      expect(typedData.types.CreateProxy).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'paymentToken', type: 'address' }),
          expect.objectContaining({ name: 'payment', type: 'uint256' }),
          expect.objectContaining({ name: 'paymentReceiver', type: 'address' }),
        ]),
      );
    });
  });

  describe('encodeCreateProxy', () => {
    it('encodes createProxy function call', () => {
      const result = encodeCreateProxy({
        paymentToken: '0x0000000000000000000000000000000000000000',
        payment: '0',
        paymentReceiver: '0x0000000000000000000000000000000000000000',
        createSig: {
          v: 27,
          r: '0x' + 'a'.repeat(64),
          s: '0x' + 'b'.repeat(64),
        },
      });

      expect(result).toMatch(/^0x[a-f0-9]+$/);
      expect(typeof result).toBe('string');
    });
  });

  describe('getDeployProxyWalletTransaction', () => {
    it('returns transaction with correct structure', async () => {
      const signer = buildSigner();
      mockSignTypedMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      const tx = await getDeployProxyWalletTransaction({ signer });

      expect(tx).toHaveProperty('from', signer.address);
      expect(tx).toHaveProperty('to', SAFE_FACTORY_ADDRESS);
      expect(tx).toHaveProperty('data');
      expect(tx?.data).toMatch(/^0x[a-f0-9]+$/);
    });

    it('calls signTypedMessage with correct parameters', async () => {
      const signer = buildSigner();
      mockSignTypedMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      await getDeployProxyWalletTransaction({ signer });

      expect(mockSignTypedMessage).toHaveBeenCalled();
    });

    it('handles error gracefully', async () => {
      const signer = buildSigner();
      mockSignTypedMessage.mockRejectedValue(new Error('Signature rejected'));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Mock implementation to suppress console output
        });

      const result = await getDeployProxyWalletTransaction({ signer });

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('checkProxyWalletDeployed', () => {
    it('returns true when contract is deployed', async () => {
      mockIsSmartContractAddress.mockResolvedValue(true);

      const isDeployed = await checkProxyWalletDeployed({
        address: TEST_SAFE_ADDRESS,
        networkClientId: 'polygon',
      });

      expect(isDeployed).toBe(true);
      expect(mockIsSmartContractAddress).toHaveBeenCalledWith(
        TEST_SAFE_ADDRESS,
        numberToHex(POLYGON_MAINNET_CHAIN_ID),
        'polygon',
      );
    });

    it('returns false when contract is not deployed', async () => {
      mockIsSmartContractAddress.mockResolvedValue(false);

      const isDeployed = await checkProxyWalletDeployed({
        address: TEST_SAFE_ADDRESS,
        networkClientId: 'polygon',
      });

      expect(isDeployed).toBe(false);
    });
  });

  describe('encodeMultisend', () => {
    it('encodes single transaction', () => {
      const txns = [
        {
          to: TEST_TO_ADDRESS,
          value: '0',
          data: '0x1234',
          operation: OperationType.Call,
        },
      ];

      const encoded = encodeMultisend({ txns });

      expect(encoded).toMatch(/^0x[a-f0-9]+$/);
      expect(typeof encoded).toBe('string');
    });

    it('encodes multiple transactions', () => {
      const txns = [
        {
          to: TEST_TO_ADDRESS,
          value: '0',
          data: '0x1234',
          operation: OperationType.Call,
        },
        {
          to: TEST_SAFE_ADDRESS,
          value: '100',
          data: '0xabcd',
          operation: OperationType.DelegateCall,
        },
      ];

      const encoded = encodeMultisend({ txns });

      expect(encoded).toMatch(/^0x[a-f0-9]+$/);
    });
  });

  describe('createSafeMultisendTransaction', () => {
    it('creates multisend transaction with correct structure', () => {
      const txns = [
        {
          to: TEST_TO_ADDRESS,
          value: '0',
          data: '0x1234',
          operation: OperationType.Call,
        },
      ];

      const multisendTx = createSafeMultisendTransaction(txns);

      expect(multisendTx.to).toBe(SAFE_MULTISEND_ADDRESS);
      expect(multisendTx.value).toBe('0');
      expect(multisendTx.operation).toBe(OperationType.DelegateCall);
      expect(multisendTx.data).toMatch(/^0x[a-f0-9]+$/);
    });
  });

  describe('aggregateTransaction', () => {
    it('returns single transaction when only one provided', () => {
      const txns = [
        {
          to: TEST_TO_ADDRESS,
          value: '0',
          data: '0x1234',
          operation: OperationType.Call,
        },
      ];

      const result = aggregateTransaction(txns);

      expect(result).toEqual(txns[0]);
    });

    it('returns multisend transaction when multiple provided', () => {
      const txns = [
        {
          to: TEST_TO_ADDRESS,
          value: '0',
          data: '0x1234',
          operation: OperationType.Call,
        },
        {
          to: TEST_SAFE_ADDRESS,
          value: '100',
          data: '0xabcd',
          operation: OperationType.Call,
        },
      ];

      const result = aggregateTransaction(txns);

      expect(result.to).toBe(SAFE_MULTISEND_ADDRESS);
      expect(result.operation).toBe(OperationType.DelegateCall);
    });
  });

  describe('createAllowancesSafeTransaction', () => {
    it('creates transaction with approvals', () => {
      const safeTxn = createAllowancesSafeTransaction();

      expect(safeTxn).toHaveProperty('to');
      expect(safeTxn).toHaveProperty('value');
      expect(safeTxn).toHaveProperty('data');
      expect(safeTxn).toHaveProperty('operation');
    });

    it('includes USDC approvals and outcome token approvals', () => {
      const safeTxn = createAllowancesSafeTransaction();

      expect(safeTxn.data).toBeDefined();
      expect(typeof safeTxn.data).toBe('string');
    });
  });

  describe('hasAllowances', () => {
    it('returns true when all allowances are set', async () => {
      mockGetAllowance.mockResolvedValue(100n);
      mockGetIsApprovedForAll.mockResolvedValue(true);

      const result = await hasAllowances({ address: TEST_ADDRESS });

      expect(result).toBe(true);
      expect(mockGetAllowance).toHaveBeenCalled();
      expect(mockGetIsApprovedForAll).toHaveBeenCalled();
    });

    it('returns false when some allowances are zero', async () => {
      mockGetAllowance.mockResolvedValueOnce(0n).mockResolvedValueOnce(100n);
      mockGetIsApprovedForAll.mockResolvedValue(true);

      const result = await hasAllowances({ address: TEST_ADDRESS });

      expect(result).toBe(false);
    });

    it('returns false when some approvals are not set', async () => {
      mockGetAllowance.mockResolvedValue(100n);
      mockGetIsApprovedForAll
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await hasAllowances({ address: TEST_ADDRESS });

      expect(result).toBe(false);
    });
  });

  describe('createClaimSafeTransaction', () => {
    const mockPosition: PredictPosition = {
      id: 'position-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcome: 'YES',
      outcomeTokenId: 'token-1',
      title: 'Test Market',
      icon: 'icon.png',
      amount: 100,
      price: 0.5,
      status: PredictPositionStatus.REDEEMABLE,
      size: 100,
      outcomeIndex: 0,
      realizedPnl: 50,
      percentPnl: 20,
      cashPnl: 50,
      initialValue: 100,
      avgPrice: 0.5,
      currentValue: 150,
      endDate: '2025-01-01',
      claimable: true,
    };

    it('creates claim transaction for single position', () => {
      const safeTxn = createClaimSafeTransaction([mockPosition]);

      expect(safeTxn).toHaveProperty('to');
      expect(safeTxn).toHaveProperty('value');
      expect(safeTxn).toHaveProperty('data');
      expect(safeTxn).toHaveProperty('operation');
    });

    it('creates claim transaction for multiple positions', () => {
      const positions = [
        mockPosition,
        { ...mockPosition, id: 'position-2', outcomeIndex: 1 },
      ];

      const safeTxn = createClaimSafeTransaction(positions);

      expect(safeTxn.to).toBe(SAFE_MULTISEND_ADDRESS);
      expect(safeTxn.operation).toBe(OperationType.DelegateCall);
    });

    it('handles negRisk positions', () => {
      const negRiskPosition = { ...mockPosition, negRisk: true };

      const safeTxn = createClaimSafeTransaction([negRiskPosition]);

      expect(safeTxn.to).toBeDefined();
      expect(safeTxn.data).toBeDefined();
    });
  });
});
