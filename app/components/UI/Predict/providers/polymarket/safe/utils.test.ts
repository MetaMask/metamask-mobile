import { Interface } from 'ethers/lib/utils';
import Engine from '../../../../../../core/Engine';
import { MATIC_CONTRACTS, POLYGON_MAINNET_CHAIN_ID } from '../constants';
import { SAFE_FACTORY_ADDRESS, SAFE_MULTISEND_ADDRESS } from './constants';
import {
  computeProxyAddress,
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
  getSafeTransactionCallData,
  getProxyWalletAllowancesTransaction,
  getClaimTransaction,
  getWithdrawTransactionCallData,
  getSafeUsdcAmount,
} from './utils';
import { OperationType } from './types';
import { Signer } from '../../types';
import { numberToHex } from '@metamask/utils';
import EthQuery from '@metamask/eth-query';
import { query } from '@metamask/controller-utils';
import { PredictPosition, PredictPositionStatus } from '../../../types';
import { isSmartContractAddress } from '../../../../../../util/transactions';
import { getAllowance, getIsApprovedForAll } from '../utils';

jest.mock('@metamask/transaction-controller', () => ({
  TransactionType: {
    cancel: 'cancel',
    contractInteraction: 'contractInteraction',
    deployContract: 'deployContract',
    incoming: 'incoming',
    personalSign: 'personalSign',
    retry: 'retry',
    sign: 'sign',
    signTypedData: 'signTypedData',
    simpleSend: 'simpleSend',
    smart: 'smart',
    swap: 'swap',
    swapAndSend: 'swapAndSend',
    swapApproval: 'swapApproval',
    tokenMethodApprove: 'tokenMethodApprove',
    tokenMethodIncreaseAllowance: 'tokenMethodIncreaseAllowance',
    tokenMethodSetApprovalForAll: 'tokenMethodSetApprovalForAll',
    tokenMethodTransfer: 'tokenMethodTransfer',
    tokenMethodTransferFrom: 'tokenMethodTransferFrom',
    tokenMethodSafeTransferFrom: 'tokenMethodSafeTransferFrom',
  },
}));

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
  encodeErc20Transfer: jest.fn(() => '0xa9059cbb000000000000000000000000'),
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
const TEST_TO_ADDRESS = '0x100c7b833bbd604a77890783439bbb9d65e31de7' as const;

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('computeProxyAddress', () => {
    it('computes proxy address from signer address', () => {
      const signer = buildSigner();

      const proxyAddress = computeProxyAddress(signer.address);

      expect(proxyAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(typeof proxyAddress).toBe('string');
    });

    it('returns properly formatted address', () => {
      const testAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      const proxyAddress = computeProxyAddress(testAddress);

      expect(proxyAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('returns deterministic address for same input', () => {
      const testAddress = '0x1234567890123456789012345678901234567890';

      const proxyAddress1 = computeProxyAddress(testAddress);
      const proxyAddress2 = computeProxyAddress(testAddress);

      expect(proxyAddress1).toBe(proxyAddress2);
    });

    it('returns different addresses for different inputs', () => {
      const address1 = '0x1234567890123456789012345678901234567890';
      const address2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      const proxyAddress1 = computeProxyAddress(address1);
      const proxyAddress2 = computeProxyAddress(address2);

      expect(proxyAddress1).not.toBe(proxyAddress2);
    });

    it('computes address using CREATE2', () => {
      const testAddress = '0x1234567890123456789012345678901234567890';

      const proxyAddress = computeProxyAddress(testAddress);

      expect(proxyAddress).toBeTruthy();
      expect(proxyAddress.length).toBe(42);
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

      expect(tx).toHaveProperty('params');
      expect(tx?.params).toHaveProperty('to', SAFE_FACTORY_ADDRESS);
      expect(tx?.params).toHaveProperty('data');
      expect(tx?.params.data).toMatch(/^0x[a-f0-9]+$/);
    });

    it('calls signTypedMessage with correct parameters', async () => {
      const signer = buildSigner();
      mockSignTypedMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      await getDeployProxyWalletTransaction({ signer });

      expect(mockSignTypedMessage).toHaveBeenCalled();
    });

    it('throws error when signing fails', async () => {
      const signer = buildSigner();
      mockSignTypedMessage.mockRejectedValue(new Error('Signature rejected'));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Mock implementation to suppress console output
        });

      await expect(getDeployProxyWalletTransaction({ signer })).rejects.toThrow(
        'Failed to generate deploy proxy wallet transaction: Signature rejected',
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('throws error with "Unknown error" when non-Error is thrown', async () => {
      const signer = buildSigner();
      mockSignTypedMessage.mockRejectedValue('string error');
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Mock implementation to suppress console output
        });

      await expect(getDeployProxyWalletTransaction({ signer })).rejects.toThrow(
        'Failed to generate deploy proxy wallet transaction: Unknown error',
      );

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

    it('creates claim transaction without transfer when includeTransfer is not provided', () => {
      const safeTxn = createClaimSafeTransaction([mockPosition]);

      expect(safeTxn).toHaveProperty('to');
      expect(safeTxn).toHaveProperty('data');
    });

    it('includes transfer transaction when includeTransfer address is provided', () => {
      const includeTransfer = { address: TEST_ADDRESS };

      const safeTxn = createClaimSafeTransaction(
        [mockPosition],
        includeTransfer,
      );

      expect(safeTxn.to).toBe(SAFE_MULTISEND_ADDRESS);
      expect(safeTxn.operation).toBe(OperationType.DelegateCall);
      expect(safeTxn.data).toBeDefined();
    });

    it('creates multisend transaction with transfer for single position when includeTransfer is provided', () => {
      const includeTransfer = { address: TEST_ADDRESS };

      const safeTxn = createClaimSafeTransaction(
        [mockPosition],
        includeTransfer,
      );

      expect(safeTxn.to).toBe(SAFE_MULTISEND_ADDRESS);
      expect(safeTxn.operation).toBe(OperationType.DelegateCall);
    });

    it('includes transfer with correct recipient address', () => {
      const recipientAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const includeTransfer = { address: recipientAddress };

      const safeTxn = createClaimSafeTransaction(
        [mockPosition],
        includeTransfer,
      );

      expect(safeTxn).toBeDefined();
      expect(safeTxn.data).toBeDefined();
    });
  });

  describe('getSafeTransactionCallData', () => {
    it('generates call data for safe transaction execution', async () => {
      // Given a Safe transaction and signer
      const signer = buildSigner();
      const mockTxn = {
        to: TEST_TO_ADDRESS,
        value: '0',
        data: '0x1234',
        operation: OperationType.Call,
      };

      setupMocksForFeeAuth();

      // When generating call data
      const callData = await getSafeTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        txn: mockTxn,
      });

      // Then call data is returned with correct format
      expect(callData).toMatch(/^0x[a-f0-9]+$/);
      expect(mockQuery).toHaveBeenCalled();
      expect(mockSignPersonalMessage).toHaveBeenCalled();
    });

    it('handles overrides parameter', async () => {
      // Given overrides are provided
      const signer = buildSigner();
      const mockTxn = {
        to: TEST_TO_ADDRESS,
        value: '0',
        data: '0x1234',
        operation: OperationType.Call,
      };

      setupMocksForFeeAuth();

      const overrides = { gasLimit: '100000' };

      // When generating call data with overrides
      const callData = await getSafeTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        txn: mockTxn,
        overrides,
      });

      // Then call data is generated successfully
      expect(callData).toMatch(/^0x[a-f0-9]+$/);
    });

    it('encodes execTransaction function call', async () => {
      // Given a transaction to execute
      const signer = buildSigner();
      const mockTxn = {
        to: TEST_TO_ADDRESS,
        value: '100',
        data: '0xabcdef',
        operation: OperationType.Call,
      };

      setupMocksForFeeAuth();

      // When generating call data
      const callData = await getSafeTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        txn: mockTxn,
      });

      // Then the call data contains execTransaction encoding
      expect(callData).toBeDefined();
      expect(typeof callData).toBe('string');
      expect(callData.length).toBeGreaterThan(10);
    });

    it('queries nonce from Safe contract', async () => {
      // Given a Safe address
      const signer = buildSigner();
      const mockTxn = {
        to: TEST_TO_ADDRESS,
        value: '0',
        data: '0x1234',
        operation: OperationType.Call,
      };

      setupMocksForFeeAuth();

      // When generating call data
      await getSafeTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        txn: mockTxn,
      });

      // Then nonce is queried from contract
      const nonceCall = mockQuery.mock.calls.find(
        (call) => call[2][0].to === TEST_SAFE_ADDRESS,
      );
      expect(nonceCall).toBeDefined();
    });
  });

  describe('getProxyWalletAllowancesTransaction', () => {
    it('generates transaction for setting allowances', async () => {
      // Given a signer
      const signer = buildSigner();

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

      // When generating allowances transaction
      const tx = await getProxyWalletAllowancesTransaction({ signer });

      // Then transaction is returned with correct structure
      expect(tx).toHaveProperty('params');
      expect(tx?.params).toHaveProperty('to');
      expect(tx?.params).toHaveProperty('data');
      expect(tx?.params.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(tx?.params.data).toMatch(/^0x[a-f0-9]+$/);
    });

    it('uses computed proxy address for transaction', async () => {
      // Given a signer with specific address
      const signer = buildSigner({
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      });

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

      // When generating allowances transaction
      const tx = await getProxyWalletAllowancesTransaction({ signer });

      // Then transaction uses the computed proxy address
      const expectedProxyAddress = computeProxyAddress(signer.address);
      expect(tx?.params.to).toBe(expectedProxyAddress);
    });

    it('includes allowances for USDC and outcome tokens', async () => {
      // Given a signer
      const signer = buildSigner();

      mockNetworkController();
      mockQuery
        .mockResolvedValueOnce(
          '0x0000000000000000000000009999999999999999999999999999999999999999',
        )
        .mockResolvedValueOnce(
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        )
        .mockResolvedValueOnce(
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        );
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      // When generating allowances transaction
      const tx = await getProxyWalletAllowancesTransaction({ signer });

      // Then transaction data includes allowance settings
      expect(tx?.params.data).toBeDefined();
      expect(tx?.params.data.length).toBeGreaterThan(10);
    });

    it('signs the transaction for execution', async () => {
      // Given a signer
      const signer = buildSigner();

      mockNetworkController();
      mockQuery
        .mockResolvedValueOnce(
          '0x0000000000000000000000009999999999999999999999999999999999999999',
        )
        .mockResolvedValueOnce(
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        )
        .mockResolvedValueOnce(
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        );
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      // When generating allowances transaction
      await getProxyWalletAllowancesTransaction({ signer });

      // Then signer's signPersonalMessage is called
      expect(mockSignPersonalMessage).toHaveBeenCalled();
    });

    it('throws error when signing fails', async () => {
      const signer = buildSigner();

      mockNetworkController();
      mockQuery
        .mockResolvedValueOnce(
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        )
        .mockResolvedValueOnce(
          '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        );
      mockSignPersonalMessage.mockRejectedValueOnce(
        new Error('User rejected signing'),
      );

      await expect(
        getProxyWalletAllowancesTransaction({ signer }),
      ).rejects.toThrow(
        'Failed to generate proxy wallet allowances transaction: User rejected signing',
      );
    });
  });

  describe('getClaimTransaction', () => {
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

    it('generates claim transaction for positions', async () => {
      // Given a signer and positions to claim
      const signer = buildSigner();
      const positions = [mockPosition];

      setupMocksForFeeAuth();

      // When generating claim transaction
      const txs = await getClaimTransaction({
        signer,
        positions,
        safeAddress: TEST_SAFE_ADDRESS,
      });

      // Then transaction is returned with correct structure
      expect(Array.isArray(txs)).toBe(true);
      expect(txs).toHaveLength(1);
      expect(txs[0]).toHaveProperty('params');
      expect(txs[0].params).toHaveProperty('to', TEST_SAFE_ADDRESS);
      expect(txs[0].params).toHaveProperty('data');
      expect(txs[0].params.data).toMatch(/^0x[a-f0-9]+$/);
    });

    it('handles multiple positions in one transaction', async () => {
      // Given multiple positions to claim
      const signer = buildSigner();
      const positions = [
        mockPosition,
        { ...mockPosition, id: 'position-2', outcomeIndex: 1 },
      ];

      setupMocksForFeeAuth();

      // When generating claim transaction
      const txs = await getClaimTransaction({
        signer,
        positions,
        safeAddress: TEST_SAFE_ADDRESS,
      });

      // Then single transaction is returned with all claims
      expect(Array.isArray(txs)).toBe(true);
      expect(txs).toHaveLength(1);
      expect(txs[0]).toHaveProperty('params');
      expect(txs[0].params).toHaveProperty('to');
      expect(txs[0].params).toHaveProperty('data');
    });

    it('signs the claim transaction', async () => {
      // Given a signer and positions
      const signer = buildSigner();
      const positions = [mockPosition];

      setupMocksForFeeAuth();

      // When generating claim transaction
      await getClaimTransaction({
        signer,
        positions,
        safeAddress: TEST_SAFE_ADDRESS,
      });

      // Then signer's signPersonalMessage is called
      expect(mockSignPersonalMessage).toHaveBeenCalled();
    });

    it('uses provided Safe address', async () => {
      // Given a specific Safe address
      const signer = buildSigner();
      const positions = [mockPosition];
      const customSafeAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      setupMocksForFeeAuth();

      // When generating claim transaction
      const txs = await getClaimTransaction({
        signer,
        positions,
        safeAddress: customSafeAddress,
      });

      // Then transaction is sent to the provided Safe address
      expect(txs[0].params.to).toBe(customSafeAddress);
    });

    it('creates transaction for negRisk positions', async () => {
      // Given a negRisk position
      const signer = buildSigner();
      const negRiskPosition = { ...mockPosition, negRisk: true };

      setupMocksForFeeAuth();

      // When generating claim transaction
      const txs = await getClaimTransaction({
        signer,
        positions: [negRiskPosition],
        safeAddress: TEST_SAFE_ADDRESS,
      });

      // Then transaction is generated successfully
      expect(txs).toBeDefined();
      expect(Array.isArray(txs)).toBe(true);
      expect(txs).toHaveLength(1);
      expect(txs[0].params.data).toMatch(/^0x[a-f0-9]+$/);
    });

    it('generates claim transaction without transfer when includeTransferTransaction is false', async () => {
      const signer = buildSigner();
      const positions = [mockPosition];

      setupMocksForFeeAuth();

      const txs = await getClaimTransaction({
        signer,
        positions,
        safeAddress: TEST_SAFE_ADDRESS,
        includeTransferTransaction: false,
      });

      expect(Array.isArray(txs)).toBe(true);
      expect(txs).toHaveLength(1);
      expect(txs[0]).toHaveProperty('params');
    });

    it('generates claim transaction without transfer when includeTransferTransaction is undefined', async () => {
      const signer = buildSigner();
      const positions = [mockPosition];

      setupMocksForFeeAuth();

      const txs = await getClaimTransaction({
        signer,
        positions,
        safeAddress: TEST_SAFE_ADDRESS,
      });

      expect(Array.isArray(txs)).toBe(true);
      expect(txs).toHaveLength(1);
    });

    it('includes transfer transaction when includeTransferTransaction is true', async () => {
      const signer = buildSigner();
      const positions = [mockPosition];

      setupMocksForFeeAuth();

      const txs = await getClaimTransaction({
        signer,
        positions,
        safeAddress: TEST_SAFE_ADDRESS,
        includeTransferTransaction: true,
      });

      expect(Array.isArray(txs)).toBe(true);
      expect(txs).toHaveLength(1);
      expect(txs[0]).toHaveProperty('params');
      expect(txs[0].params).toHaveProperty('data');
    });

    it('uses signer address for transfer when includeTransferTransaction is true', async () => {
      const signerAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const signer = buildSigner({ address: signerAddress });
      const positions = [mockPosition];

      setupMocksForFeeAuth();

      const txs = await getClaimTransaction({
        signer,
        positions,
        safeAddress: TEST_SAFE_ADDRESS,
        includeTransferTransaction: true,
      });

      expect(txs).toBeDefined();
      expect(Array.isArray(txs)).toBe(true);
      expect(txs[0].params.data).toMatch(/^0x[a-f0-9]+$/);
    });

    it('signs claim transaction with transfer when includeTransferTransaction is true', async () => {
      const signer = buildSigner();
      const positions = [mockPosition];

      setupMocksForFeeAuth();

      await getClaimTransaction({
        signer,
        positions,
        safeAddress: TEST_SAFE_ADDRESS,
        includeTransferTransaction: true,
      });

      expect(mockSignPersonalMessage).toHaveBeenCalled();
    });
  });

  describe('getWithdrawTransactionCallData', () => {
    it('generates call data for withdraw transaction', async () => {
      const signer = buildSigner();
      const data = `0xa9059cbb${'0'.repeat(128)}`;

      setupMocksForFeeAuth();

      const callData = await getWithdrawTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        data: data as `0x${string}`,
      });

      expect(callData).toMatch(/^0x[a-f0-9]+$/);
      expect(typeof callData).toBe('string');
    });

    it('uses MATIC collateral contract address', async () => {
      const signer = buildSigner();
      const data = `0xa9059cbb${'0'.repeat(128)}`;

      setupMocksForFeeAuth();

      const callData = await getWithdrawTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        data: data as `0x${string}`,
      });

      expect(callData).toBeDefined();
      expect(mockQuery).toHaveBeenCalled();
    });

    it('creates Call operation type transaction', async () => {
      const signer = buildSigner();
      const data = '0x1234567890abcdef';

      setupMocksForFeeAuth();

      const callData = await getWithdrawTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        data: data as `0x${string}`,
      });

      expect(callData).toBeTruthy();
      expect(callData.length).toBeGreaterThan(10);
    });

    it('signs the withdraw transaction', async () => {
      const signer = buildSigner();
      const data = `0xa9059cbb${'0'.repeat(128)}`;

      setupMocksForFeeAuth();

      await getWithdrawTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        data: data as `0x${string}`,
      });

      expect(mockSignPersonalMessage).toHaveBeenCalled();
    });

    it('queries nonce from Safe contract', async () => {
      const signer = buildSigner();
      const data = `0xa9059cbb${'0'.repeat(128)}`;

      setupMocksForFeeAuth();

      await getWithdrawTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        data: data as `0x${string}`,
      });

      const nonceCall = mockQuery.mock.calls.find(
        (call) => call[2][0].to === TEST_SAFE_ADDRESS,
      );
      expect(nonceCall).toBeDefined();
    });

    it('handles custom data parameter', async () => {
      const signer = buildSigner();
      const customData =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de7000000000000000000000000000000000000000000000000000000000000007b';

      setupMocksForFeeAuth();

      const callData = await getWithdrawTransactionCallData({
        signer,
        safeAddress: TEST_SAFE_ADDRESS,
        data: customData as `0x${string}`,
      });

      expect(callData).toMatch(/^0x[a-f0-9]+$/);
    });
  });

  describe('getSafeUsdcAmount', () => {
    it('decodes USDC amount from ERC20 transfer data', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000000989680';

      const amount = getSafeUsdcAmount(data);

      expect(amount).toBe(10);
    });

    it('returns zero for transfer with zero amount', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000000000000';

      const amount = getSafeUsdcAmount(data);

      expect(amount).toBe(0);
    });

    it('decodes small fractional USDC amount', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000000000001';

      const amount = getSafeUsdcAmount(data);

      expect(amount).toBe(0.000001);
    });

    it('decodes large USDC amount', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000077359400';

      const amount = getSafeUsdcAmount(data);

      expect(amount).toBe(2000);
    });

    it('rounds to 6 decimal places for USDC precision', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000000989680';

      const amount = getSafeUsdcAmount(data);

      expect(amount).toBe(10);
      expect(amount.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(
        6,
      );
    });

    it('throws error for non-ERC20 transfer data', () => {
      const invalidData =
        '0x12345678000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000000989680';

      expect(() => getSafeUsdcAmount(invalidData)).toThrow(
        'Not an ERC20 transfer call',
      );
    });

    it('throws error for data without transfer selector', () => {
      const invalidData = '0x000000000000000000000000100c7b833bbd604a77';

      expect(() => getSafeUsdcAmount(invalidData)).toThrow(
        'Not an ERC20 transfer call',
      );
    });

    it('throws error for invalid encoded amount', () => {
      const invalidData =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de7GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG';

      expect(() => getSafeUsdcAmount(invalidData)).toThrow(
        'Invalid encoded amount in calldata',
      );
    });

    it('throws error for unreasonably large USDC amount', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      expect(() => getSafeUsdcAmount(data)).toThrow(
        'Decoded USDC amount is invalid or too large',
      );
    });

    it('handles 1.5 USDC amount correctly', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000000186a00';

      const amount = getSafeUsdcAmount(data);

      expect(amount).toBe(1.6);
    });

    it('decodes medium-sized USDC amounts', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000002faf080';

      const amount = getSafeUsdcAmount(data);

      expect(amount).toBe(50);
    });

    it('validates non-negative amounts', () => {
      const validData =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de70000000000000000000000000000000000000000000000000000000000000064';

      const amount = getSafeUsdcAmount(validData);

      expect(amount).toBeGreaterThanOrEqual(0);
    });

    it('handles exact 1 USDC', () => {
      const data =
        '0xa9059cbb000000000000000000000000100c7b833bbd604a77890783439bbb9d65e31de700000000000000000000000000000000000000000000000000000000000f4240';

      const amount = getSafeUsdcAmount(data);

      expect(amount).toBe(1);
    });
  });
});
