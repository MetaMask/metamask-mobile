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

describe('safe utils', () => {
  function buildSigner({
    address = '0x1234567890123456789012345678901234567890',
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

      expect(safeAddress).toBe('0x9999999999999999999999999999999999999999');
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
    it('creates fee authorization with correct structure', async () => {
      const signer = buildSigner();
      const safeAddress = '0x9999999999999999999999999999999999999999';
      const amount = BigInt(1000000);
      const to = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';
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

      const feeAuth = await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount,
        to,
      });

      expect(feeAuth).toHaveProperty('type', 'safe-transaction');
      expect(feeAuth).toHaveProperty('authorization');
      expect(feeAuth.authorization).toHaveProperty('tx');
      expect(feeAuth.authorization).toHaveProperty('sig');
    });

    it('encodes ERC20 transfer correctly', async () => {
      const signer = buildSigner();
      const safeAddress = '0x9999999999999999999999999999999999999999';
      const amount = BigInt(500000);
      const to = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';
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

      const feeAuth = await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount,
        to,
      });

      const expectedTransferData = new Interface([
        'function transfer(address to, uint256 amount)',
      ]).encodeFunctionData('transfer', [to, amount]);
      expect(feeAuth.authorization.tx.data).toBe(expectedTransferData);
    });

    it('sets operation type to Call', async () => {
      const signer = buildSigner();
      const safeAddress = '0x9999999999999999999999999999999999999999';
      const amount = BigInt(250000);
      const to = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';
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

      const feeAuth = await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount,
        to,
      });

      expect(feeAuth.authorization.tx.operation).toBe(OperationType.Call);
    });

    it('uses MATIC_CONTRACTS.collateral as token address', async () => {
      const signer = buildSigner();
      const safeAddress = '0x9999999999999999999999999999999999999999';
      const amount = BigInt(750000);
      const to = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';
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

      const feeAuth = await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount,
        to,
      });

      expect(feeAuth.authorization.tx.to).toBe(MATIC_CONTRACTS.collateral);
    });

    it('signs the Safe transaction', async () => {
      const signer = buildSigner();
      const safeAddress = '0x9999999999999999999999999999999999999999';
      const amount = BigInt(1500000);
      const to = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';
      mockNetworkController();
      mockQuery
        .mockResolvedValueOnce(
          '0x0000000000000000000000000000000000000000000000000000000000000002',
        )
        .mockResolvedValueOnce(
          '0x1234567812345678123456781234567812345678123456781234567812345678',
        );
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      const feeAuth = await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount,
        to,
      });

      expect(mockSignPersonalMessage).toHaveBeenCalled();
      expect(feeAuth.authorization.sig).toBeTruthy();
      expect(feeAuth.authorization.sig).toMatch(/^0x[a-f0-9]+$/);
    });

    it('returns SafeFeeAuthorization type', async () => {
      const signer = buildSigner();
      const safeAddress = '0x9999999999999999999999999999999999999999';
      const amount = BigInt(2000000);
      const to = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';
      mockNetworkController();
      mockQuery
        .mockResolvedValueOnce(
          '0x0000000000000000000000000000000000000000000000000000000000000003',
        )
        .mockResolvedValueOnce(
          '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcbafedcbafabc',
        );
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      const feeAuth = await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount,
        to,
      });

      expect(feeAuth.authorization.tx.value).toBe('0');
      expect(typeof feeAuth.authorization.sig).toBe('string');
    });

    it('calls Safe contract for nonce', async () => {
      const signer = buildSigner();
      const safeAddress = '0x9999999999999999999999999999999999999999';
      const amount = BigInt(3000000);
      const to = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';
      mockNetworkController();
      mockQuery
        .mockResolvedValueOnce(
          '0x0000000000000000000000000000000000000000000000000000000000000005',
        )
        .mockResolvedValueOnce(
          '0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd',
        );
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount,
        to,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(EthQuery),
        'call',
        expect.arrayContaining([
          expect.objectContaining({
            to: safeAddress,
          }),
        ]),
      );
    });

    it('calls Safe contract for transaction hash', async () => {
      const signer = buildSigner();
      const safeAddress = '0x9999999999999999999999999999999999999999';
      const amount = BigInt(4000000);
      const to = '0xe6a2026d58eaff3c7ad7ba9386fb143388002382';
      mockNetworkController();
      mockQuery
        .mockResolvedValueOnce(
          '0x0000000000000000000000000000000000000000000000000000000000000001',
        )
        .mockResolvedValueOnce(
          '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        );
      mockSignPersonalMessage.mockResolvedValue(
        '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344556677889900',
      );

      await createSafeFeeAuthorization({
        safeAddress,
        signer,
        amount,
        to,
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const secondCallArgs = mockQuery.mock.calls[1];
      expect(secondCallArgs[2][0].to).toBe(safeAddress);
    });
  });
});
