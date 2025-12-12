import {
  IsAtomicBatchSupportedRequest,
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { SignMessenger, getDelegationTransaction } from './delegation';
import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { Hex } from '@metamask/utils';

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

const TRANSACTION_META_MOCK = {
  chainId: '0x1' as Hex,
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
      nextNonce: NONCE_MOCK,
      releaseLock: jest.fn(),
    });
  });

  describe('getDelegationTransaction', () => {
    it('returns delegation data', async () => {
      const result = await getDelegationTransaction(
        messengerMock,
        TRANSACTION_META_MOCK,
      );

      expect(result).toMatchSnapshot();
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
  });
});
