import { Messenger } from '@metamask/base-controller';
import { BridgeStatusControllerGetStateAction } from '@metamask/bridge-status-controller';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import {
  KeyringControllerSignEip7702AuthorizationAction,
  KeyringControllerSignTypedMessageAction,
} from '@metamask/keyring-controller';
import {
  GasFeeToken,
  TransactionController,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Delegation7702PublishHook } from './delegation-7702-publish';
import {
  RelayStatus,
  submitRelayTransaction,
  waitForRelayResult,
} from '../../../core/RPCMethods/transaction-relay';
import { TransactionControllerInitMessenger } from '../../../core/Engine/messengers/transaction-controller-messenger';
import { toHex } from '@metamask/controller-utils';
import { getDeleGatorEnvironment } from '../../../core/Delegation';

jest.mock('../../../core/RPCMethods/transaction-relay');
jest.mock('../../../core/RPCMethods/lib/transaction/delegation', () => ({
  ...jest.requireActual('../../../core/RPCMethods/lib/transaction/delegation'),
  encodeRedeemDelegations: jest.fn(() => '0xdeadbeef'),
  signDelegation: jest.fn(async () => '0xsignature'),
}));

const SIGNED_TX_MOCK = '0x1234';
const DELEGATION_SIGNATURE_MOCK = '0xabcd';
const TRANSACTION_HASH_MOCK = '0xefab';
const UUID_MOCK = '0x123';

const AUTHORIZATION_SIGNATURE_MOCK =
  '0xf85c827a6994663f3ad617193148711d28f5334ee4ed070166028080a040e292da533253143f134643a03405f1af1de1d305526f44ed27e62061368d4ea051cfb0af34e491aa4d6796dececf95569088322e116c4b2f312bb23f20699269';

const UPGRADE_CONTRACT_ADDRESS_MOCK =
  '0x12345678901234567890123456789012345678a4';

const TRANSACTION_META_MOCK = {
  chainId: '0x1',
  txParams: {
    from: '0x12345678901234567890123456789012345678ab',
    maxFeePerGas: '0x2',
    maxPriorityFeePerGas: '0x1',
    nonce: '0x3',
    to: '0x12345678901234567890123456789012345678a3',
  },
} as unknown as TransactionMeta;

const GAS_FEE_TOKEN_MOCK: GasFeeToken = {
  amount: toHex(1000),
  balance: toHex(2345),
  decimals: 3,
  gas: '0x3',
  gasTransfer: '0x3a',
  maxFeePerGas: '0x4',
  maxPriorityFeePerGas: '0x5',
  rateWei: toHex('1798170000000000000'),
  recipient: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  tokenAddress: '0x1234567890123456789012345678901234567890',
};

describe('Delegation 7702 Publish Hook', () => {
  const submitRelayTransactionMock = jest.mocked(submitRelayTransaction);
  const waitForRelayResultMock = jest.mocked(waitForRelayResult);

  let messenger: TransactionControllerInitMessenger;
  let hookClass: Delegation7702PublishHook;

  const signTypedMessageMock: jest.MockedFn<
    KeyringControllerSignTypedMessageAction['handler']
  > = jest.fn();

  const signEip7702AuthorizationMock: jest.MockedFn<
    KeyringControllerSignEip7702AuthorizationAction['handler']
  > = jest.fn();

  const isAtomicBatchSupportedMock: jest.MockedFn<
    TransactionController['isAtomicBatchSupported']
  > = jest.fn();

  const signDelegationControllerMock: jest.MockedFn<
    DelegationControllerSignDelegationAction['handler']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    const baseMessenger = new Messenger<
      | BridgeStatusControllerGetStateAction
      | DelegationControllerSignDelegationAction
      | KeyringControllerSignEip7702AuthorizationAction
      | KeyringControllerSignTypedMessageAction,
      never
    >();

    messenger = baseMessenger.getRestricted({
      name: 'TransactionController',
      allowedActions: [
        'KeyringController:signEip7702Authorization',
        'KeyringController:signTypedMessage',
        'BridgeStatusController:getState',
        'DelegationController:signDelegation',
      ],
      allowedEvents: [],
    }) as TransactionControllerInitMessenger;

    baseMessenger.registerActionHandler(
      'KeyringController:signEip7702Authorization',
      signEip7702AuthorizationMock,
    );

    baseMessenger.registerActionHandler(
      'KeyringController:signTypedMessage',
      signTypedMessageMock,
    );

    baseMessenger.registerActionHandler(
      'DelegationController:signDelegation',
      signDelegationControllerMock,
    );

    hookClass = new Delegation7702PublishHook({
      isAtomicBatchSupported: isAtomicBatchSupportedMock,
      messenger,
    });

    isAtomicBatchSupportedMock.mockResolvedValue([]);
    signTypedMessageMock.mockResolvedValue(DELEGATION_SIGNATURE_MOCK);
    signDelegationControllerMock.mockResolvedValue(DELEGATION_SIGNATURE_MOCK);

    submitRelayTransactionMock.mockResolvedValue({
      uuid: UUID_MOCK,
    });

    signEip7702AuthorizationMock.mockResolvedValue(
      AUTHORIZATION_SIGNATURE_MOCK,
    );

    waitForRelayResultMock.mockResolvedValue({
      status: RelayStatus.Success,
      transactionHash: TRANSACTION_HASH_MOCK,
    });
  });

  describe('returns empty result if', () => {
    it('atomic batch is not supported', async () => {
      const result = await hookClass.getHook()(
        TRANSACTION_META_MOCK,
        SIGNED_TX_MOCK,
      );

      expect(result).toEqual({
        transactionHash: undefined,
      });
    });

    it('no selected gas fee token', async () => {
      isAtomicBatchSupportedMock.mockResolvedValueOnce([
        {
          chainId: TRANSACTION_META_MOCK.chainId,
          delegationAddress: undefined,
          isSupported: false,
        },
      ]);

      const result = await hookClass.getHook()(
        {
          ...TRANSACTION_META_MOCK,
          gasFeeTokens: [GAS_FEE_TOKEN_MOCK],
        },
        SIGNED_TX_MOCK,
      );

      expect(result).toEqual({
        transactionHash: undefined,
      });
    });

    it('no gas fee tokens', async () => {
      isAtomicBatchSupportedMock.mockResolvedValueOnce([
        {
          chainId: TRANSACTION_META_MOCK.chainId,
          delegationAddress: undefined,
          isSupported: false,
        },
      ]);

      const result = await hookClass.getHook()(
        {
          ...TRANSACTION_META_MOCK,
          selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
        },
        SIGNED_TX_MOCK,
      );

      expect(result).toEqual({
        transactionHash: undefined,
      });
    });
  });

  it('submits request to transaction relay', async () => {
    isAtomicBatchSupportedMock.mockResolvedValueOnce([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        isSupported: true,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    await hookClass.getHook()(
      {
        ...TRANSACTION_META_MOCK,
        gasFeeTokens: [GAS_FEE_TOKEN_MOCK],
        selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
      },
      SIGNED_TX_MOCK,
    );

    expect(submitRelayTransactionMock).toHaveBeenCalledTimes(1);
    const expectedDelegationManager = getDeleGatorEnvironment(
      parseInt(TRANSACTION_META_MOCK.chainId, 16),
    ).DelegationManager;
    expect(submitRelayTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: TRANSACTION_META_MOCK.chainId,
        to: expectedDelegationManager,
      }),
    );
  });

  it('returns transaction hash from transaction relay result', async () => {
    isAtomicBatchSupportedMock.mockResolvedValueOnce([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        isSupported: true,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    const result = await hookClass.getHook()(
      {
        ...TRANSACTION_META_MOCK,
        gasFeeTokens: [GAS_FEE_TOKEN_MOCK],
        selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
      },
      SIGNED_TX_MOCK,
    );

    expect(result).toStrictEqual({
      transactionHash: TRANSACTION_HASH_MOCK,
    });
  });

  it('includes authorization list if not upgraded', async () => {
    isAtomicBatchSupportedMock.mockResolvedValueOnce([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        delegationAddress: undefined,
        isSupported: false,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    await hookClass.getHook()(
      {
        ...TRANSACTION_META_MOCK,
        gasFeeTokens: [GAS_FEE_TOKEN_MOCK],
        selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
      },
      SIGNED_TX_MOCK,
    );

    expect(submitRelayTransactionMock).toHaveBeenCalledTimes(1);
    expect(submitRelayTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationList: [
          {
            address: UPGRADE_CONTRACT_ADDRESS_MOCK,
            chainId: TRANSACTION_META_MOCK.chainId,
            nonce: TRANSACTION_META_MOCK.txParams.nonce,
            r: expect.any(String),
            s: expect.any(String),
            yParity: expect.any(String),
          },
        ],
      }),
    );
  });

  it('throws if relay status is not success', async () => {
    waitForRelayResultMock.mockResolvedValueOnce({
      status: 'TEST_STATUS',
    });

    isAtomicBatchSupportedMock.mockResolvedValueOnce([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        isSupported: true,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    await expect(
      hookClass.getHook()(
        {
          ...TRANSACTION_META_MOCK,
          gasFeeTokens: [GAS_FEE_TOKEN_MOCK],
          selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
        },
        SIGNED_TX_MOCK,
      ),
    ).rejects.toThrow('Transaction relay error - TEST_STATUS');
  });

  it('submits request to relay for gasless 7702 swap without gas fee tokens', async () => {
    isAtomicBatchSupportedMock.mockResolvedValueOnce([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        isSupported: true,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    // Provide an id and make bridge status return gasIncluded7702: true
    const GASLESS_TX_ID = 'tx-123';
    const gaslessTxMeta = {
      ...TRANSACTION_META_MOCK,
      id: GASLESS_TX_ID,
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.swap }],
      // No gasFeeTokens and no selectedGasFeeToken
      isGasFeeIncluded: true,
    } as unknown as TransactionMeta;

    await hookClass.getHook()(gaslessTxMeta, SIGNED_TX_MOCK);

    expect(submitRelayTransactionMock).toHaveBeenCalledTimes(1);
  });

  it('signs delegation for gasless 7702 swap without gas fee tokens', async () => {
    isAtomicBatchSupportedMock.mockResolvedValueOnce([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        isSupported: true,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    // Provide an id and make bridge status return gasIncluded7702: true
    const GASLESS_TX_ID = 'tx-123';
    const gaslessTxMeta = {
      ...TRANSACTION_META_MOCK,
      id: GASLESS_TX_ID,
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.swap }],
      // No gasFeeTokens and no selectedGasFeeToken
      isGasFeeIncluded: true,
    } as unknown as TransactionMeta;

    await hookClass.getHook()(gaslessTxMeta, SIGNED_TX_MOCK);

    expect(signDelegationControllerMock).toHaveBeenCalledTimes(1);
    // Ensure caveats contain a single exactExecution for gasless flow
    const signArgs = signDelegationControllerMock.mock.calls[0][0];
    expect(Array.isArray(signArgs.delegation.caveats)).toBe(true);
    expect(signArgs.delegation.caveats).toHaveLength(2);
    // No transfer execution should be included for gasless flow
  });

  it('builds caveats for non-gasless flow', async () => {
    isAtomicBatchSupportedMock.mockResolvedValueOnce([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        isSupported: true,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    await hookClass.getHook()(
      {
        ...TRANSACTION_META_MOCK,
        gasFeeTokens: [GAS_FEE_TOKEN_MOCK],
        selectedGasFeeToken: GAS_FEE_TOKEN_MOCK.tokenAddress,
      },
      SIGNED_TX_MOCK,
    );

    expect(signDelegationControllerMock).toHaveBeenCalledTimes(1);
    const nonGaslessSignArgs = signDelegationControllerMock.mock.calls[0][0];
    expect(Array.isArray(nonGaslessSignArgs.delegation.caveats)).toBe(true);
    expect(nonGaslessSignArgs.delegation.caveats.length).toBe(2);
  });
});
