import {
  IsAtomicBatchSupportedRequest,
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { SignMessenger, getDelegationTransaction } from './delegation';
import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { Hex } from '@metamask/utils';
import { type Caveat } from '../../core/Delegation';

const mockGetNonceLock = jest.fn();

const mockIsAtomicBatchSupported: jest.MockedFn<
  TransactionController['isAtomicBatchSupported']
> = jest.fn();

jest.spyOn(Math, 'random').mockReturnValue(0);

jest.mock('../../core/Engine', () => ({
  context: {
    TransactionController: {
      getNonceLock: () => mockGetNonceLock(),
      isAtomicBatchSupported: (request: IsAtomicBatchSupportedRequest) =>
        mockIsAtomicBatchSupported(request),
    },
  },
}));

const DELEGATION_SIGNATURE_MOCK = '0x111222333';
const UPGRADE_CONTRACT_ADDRESS_MOCK = '0x456' as Hex;
const NONCE_MOCK = 123;

const AUTHORIZATION_SIGNATURE_MOCK =
  '0xf85c827a6994663f3ad617193148711d28f5334ee4ed070166028080a040e292da533253143f134643a03405f1af1de1d305526f44ed27e62061368d4ea051cfb0af34e491aa4d6796dececf95569088322e116c4b2f312bb23f20699269';

const NETWORK_CLIENT_ID_MOCK = 'mainnet';

const TRANSACTION_META_MOCK = {
  chainId: '0x1' as Hex,
  networkClientId: NETWORK_CLIENT_ID_MOCK,
  nestedTransactions: [
    {
      data: '0x123456781234' as Hex,
      to: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
    },
  ],
  txParams: {
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  },
} as TransactionMeta;

describe('Transaction Delegation Utils', () => {
  const signDelegationMock = jest.fn();
  const sign7702Mock = jest.fn();
  let messengerMock: SignMessenger;

  beforeEach(() => {
    jest.clearAllMocks();

    messengerMock = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });

    messengerMock.registerActionHandler(
      'DelegationController:signDelegation',
      signDelegationMock,
    );

    messengerMock.registerActionHandler(
      'KeyringController:signEip7702Authorization',
      sign7702Mock,
    );

    signDelegationMock.mockResolvedValue(DELEGATION_SIGNATURE_MOCK);
    sign7702Mock.mockResolvedValue(AUTHORIZATION_SIGNATURE_MOCK);

    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        isSupported: false,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    mockGetNonceLock.mockResolvedValue({
      nonceDetails: { params: { nextNetworkNonce: NONCE_MOCK } },
      releaseLock: jest.fn(),
    });
  });

  describe('getDelegationTransaction', () => {
    it('returns delegation data', async () => {
      const result = await getDelegationTransaction(
        messengerMock,
        TRANSACTION_META_MOCK,
      );

      expect(result).toBeDefined();
      expect(result.to).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.value).toBe('0x0');
      expect(result.authorizationList).toHaveLength(1);
      expect(result.authorizationList?.[0].address).toBe(
        UPGRADE_CONTRACT_ADDRESS_MOCK,
      );
    });

    it('does not include authorization if already upgraded', async () => {
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: TRANSACTION_META_MOCK.chainId,
          delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
          isSupported: true,
          upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        },
      ]);

      const result = await getDelegationTransaction(messengerMock, {
        ...TRANSACTION_META_MOCK,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      });

      expect(result.authorizationList).toBeUndefined();
    });

    it('includes authorization if upgraded to different contract', async () => {
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: TRANSACTION_META_MOCK.chainId,
          delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
          isSupported: false,
          upgradeContractAddress: '0x789' as Hex,
        },
      ]);

      const result = await getDelegationTransaction(messengerMock, {
        ...TRANSACTION_META_MOCK,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      });

      expect(result.authorizationList).toHaveLength(1);
    });

    it('calls DelegationController to sign delegation', async () => {
      await getDelegationTransaction(messengerMock, TRANSACTION_META_MOCK);

      expect(signDelegationMock).toHaveBeenCalledWith({
        chainId: TRANSACTION_META_MOCK.chainId,
        delegation: expect.any(Object),
      });
    });

    it('calls KeyringController to sign authorization', async () => {
      await getDelegationTransaction(messengerMock, TRANSACTION_META_MOCK);

      expect(sign7702Mock).toHaveBeenCalledWith({
        chainId: 1,
        contractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        from: TRANSACTION_META_MOCK.txParams.from,
        nonce: NONCE_MOCK,
      });
    });

    it('throws if chain does not support EIP-7702', async () => {
      mockIsAtomicBatchSupported.mockResolvedValue([]);

      await expect(
        getDelegationTransaction(messengerMock, TRANSACTION_META_MOCK),
      ).rejects.toThrow('Chain does not support EIP-7702');
    });

    it('throws if upgrade contract address is not found', async () => {
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: TRANSACTION_META_MOCK.chainId,
          isSupported: false,
          upgradeContractAddress: undefined,
        },
      ]);

      await expect(
        getDelegationTransaction(messengerMock, TRANSACTION_META_MOCK),
      ).rejects.toThrow('Upgrade contract address not found');
    });

    it('builds subsidized caveats when isSubsidized is true', async () => {
      // ERC20 transfer calldata: selector (0xa9059cbb) + recipient (padded to 32 bytes) + amount (padded to 32 bytes)
      // Recipient: 0x1111111111111111111111111111111111111111 padded = 0x0000000000000000000000001111111111111111111111111111111111111111
      // Amount: 0x0989680 padded = 0x0000000000000000000000000000000000000000000000000000000000989680
      const transferCalldata =
        '0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000989680' as Hex;

      const transactionWithNested: TransactionMeta = {
        ...TRANSACTION_META_MOCK,
        nestedTransactions: [
          {
            data: transferCalldata,
            to: '0x1234567890123456789012345678901234567890' as Hex,
            value: '0x0' as Hex,
          },
        ],
      };

      await getDelegationTransaction(
        messengerMock,
        transactionWithNested,
        true,
      );

      expect(signDelegationMock).toHaveBeenCalledWith({
        chainId: transactionWithNested.chainId,
        delegation: expect.objectContaining({
          caveats: expect.arrayContaining([
            expect.objectContaining({
              enforcer: expect.any(String),
            }),
          ]),
        }),
      });

      // Verify 4 caveats were built (limitedCalls, allowedTargets, 2x allowedCalldata)
      const delegationCall = signDelegationMock.mock.calls[0][0];
      const caveats = (
        (delegationCall as Record<string, unknown>).delegation as Record<
          string,
          unknown
        >
      ).caveats as Caveat[];
      expect(caveats).toHaveLength(4);
    });

    it('throws when subsidized execute has no nestedTransactions', async () => {
      const transactionWithoutNested: TransactionMeta = {
        ...TRANSACTION_META_MOCK,
        nestedTransactions: [],
      };

      await expect(
        getDelegationTransaction(messengerMock, transactionWithoutNested, true),
      ).rejects.toThrow(
        'Subsidized Caveats: expected single-step deposit route',
      );
    });

    it('throws when subsidized execute is missing token address or calldata', async () => {
      const transactionWithoutCalldata: TransactionMeta = {
        ...TRANSACTION_META_MOCK,
        nestedTransactions: [
          {
            data: undefined as unknown as Hex,
            to: undefined as unknown as Hex,
            value: '0x0' as Hex,
          },
        ],
      };

      await expect(
        getDelegationTransaction(
          messengerMock,
          transactionWithoutCalldata,
          true,
        ),
      ).rejects.toThrow(
        'Subsidized Caveats: missing token address or calldata',
      );
    });

    it('throws when subsidized execute calldata is not an ERC20 transfer', async () => {
      const transactionWithNonTransfer: TransactionMeta = {
        ...TRANSACTION_META_MOCK,
        nestedTransactions: [
          {
            data: `0xdeadbeef${'0'.repeat(128)}` as Hex,
            to: '0x1234567890123456789012345678901234567890' as Hex,
            value: '0x0' as Hex,
          },
        ],
      };

      await expect(
        getDelegationTransaction(
          messengerMock,
          transactionWithNonTransfer,
          true,
        ),
      ).rejects.toThrow('Subsidized Caveats: expected ERC20 transfer calldata');
    });

    it('throws when subsidized execute transfer calldata is too short', async () => {
      const transactionWithShortCalldata: TransactionMeta = {
        ...TRANSACTION_META_MOCK,
        nestedTransactions: [
          {
            data: `0xa9059cbb${'0'.repeat(100)}` as Hex,
            to: '0x1234567890123456789012345678901234567890' as Hex,
            value: '0x0' as Hex,
          },
        ],
      };

      await expect(
        getDelegationTransaction(
          messengerMock,
          transactionWithShortCalldata,
          true,
        ),
      ).rejects.toThrow('Subsidized Caveats: transfer calldata too short');
    });
  });
});
