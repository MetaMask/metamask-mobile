import { Interface } from 'ethers/lib/utils';
import Engine from '../../../../../../core/Engine';
import { MATIC_CONTRACTS, POLYGON_MAINNET_CHAIN_ID } from '../constants';
import { SAFE_FACTORY_ADDRESS } from './constants';
import { computeSafeAddress, createSafeFeeAuthorization } from './utils';
import { OperationType } from './types';
import { Signer } from '../../types';
import { numberToHex } from '@metamask/utils';
import EthQuery from '@metamask/eth-query';
import { query } from '@metamask/controller-utils';

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

const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.Mock;
const mockGetNetworkClientById = Engine.context.NetworkController
  .getNetworkClientById as jest.Mock;
const mockSignPersonalMessage = Engine.context.KeyringController
  .signPersonalMessage as jest.Mock;
const mockQuery = query as jest.Mock;

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const TEST_SAFE_ADDRESS = '0x9999999999999999999999999999999999999999' as const;
const TEST_TO_ADDRESS = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382' as const;

function buildSigner({
  address = TEST_ADDRESS,
  signPersonalMessage = mockSignPersonalMessage,
}: Partial<Signer> = {}): Signer {
  return {
    address,
    signPersonalMessage,
    signTypedMessage: jest.fn(),
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

      const safeAddress = await computeSafeAddress(signer);

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

      await computeSafeAddress(signer);

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

      const safeAddress = await computeSafeAddress(signer);

      expect(safeAddress).toMatch(/^0x[a-f0-9]{40}$/);
    });

    it('uses Polygon network', async () => {
      const signer = buildSigner();
      mockNetworkController();
      mockQuery.mockResolvedValue(
        '0x0000000000000000000000009999999999999999999999999999999999999999',
      );

      await computeSafeAddress(signer);

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
});
