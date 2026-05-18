import {
  SignTypedDataVersion,
  type PersonalMessageParams,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import type { Hex } from '@metamask/utils';

import {
  deriveDepositWalletAddress,
  executeDepositWalletBatchAndWaitForCompletion,
} from '../../../../components/UI/Predict/providers/polymarket/depositWallet';
import type { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import { createPolymarketCallbacks } from './polymarket-callbacks';

jest.mock(
  '../../../../components/UI/Predict/providers/polymarket/depositWallet',
);

const EOA_MOCK = '0x1111111111111111111111111111111111111111' as Hex;
const DEPOSIT_WALLET_MOCK = '0x2222222222222222222222222222222222222222' as Hex;
const SOURCE_HASH_MOCK = `0x${'aa'.repeat(32)}` as Hex;

const CALLS_MOCK = [
  {
    target: '0x3333333333333333333333333333333333333333' as Hex,
    data: '0x' as Hex,
    value: '0',
  },
];

function buildInitMessenger() {
  return {
    call: jest.fn(),
  } as unknown as jest.Mocked<TransactionPayControllerInitMessenger>;
}

describe('createPolymarketCallbacks', () => {
  const deriveDepositWalletAddressMock = jest.mocked(
    deriveDepositWalletAddress,
  );
  const executeDepositWalletBatchAndWaitForCompletionMock = jest.mocked(
    executeDepositWalletBatchAndWaitForCompletion,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    deriveDepositWalletAddressMock.mockReturnValue(DEPOSIT_WALLET_MOCK);
    executeDepositWalletBatchAndWaitForCompletionMock.mockResolvedValue(
      SOURCE_HASH_MOCK,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getDepositWalletAddress', () => {
    it('returns the derived deposit-wallet address for the given EOA', async () => {
      const callbacks = createPolymarketCallbacks(buildInitMessenger());

      const result = await callbacks.getDepositWalletAddress({ eoa: EOA_MOCK });

      expect(result).toBe(DEPOSIT_WALLET_MOCK);
      expect(deriveDepositWalletAddressMock).toHaveBeenCalledWith(EOA_MOCK);
    });
  });

  describe('submitDepositWalletBatch', () => {
    it('returns the relayer source hash on success', async () => {
      const initMessenger = buildInitMessenger();
      const callbacks = createPolymarketCallbacks(initMessenger);

      const result = await callbacks.submitDepositWalletBatch({
        eoa: EOA_MOCK,
        depositWallet: DEPOSIT_WALLET_MOCK,
        calls: CALLS_MOCK,
      });

      expect(result).toStrictEqual({ sourceHash: SOURCE_HASH_MOCK });
      expect(
        executeDepositWalletBatchAndWaitForCompletionMock,
      ).toHaveBeenCalledTimes(1);
      expect(
        executeDepositWalletBatchAndWaitForCompletionMock.mock.calls[0][0],
      ).toMatchObject({
        walletAddress: DEPOSIT_WALLET_MOCK,
        calls: CALLS_MOCK,
        signer: expect.objectContaining({ address: EOA_MOCK }),
      });
    });

    it('signs typed and personal messages via the init messenger', async () => {
      const initMessenger = buildInitMessenger();
      initMessenger.call.mockImplementation(((action: string) => {
        if (action === 'KeyringController:signTypedMessage') {
          return Promise.resolve('0xtyped');
        }
        if (action === 'KeyringController:signPersonalMessage') {
          return Promise.resolve('0xpersonal');
        }
        return undefined;
      }) as never);
      const callbacks = createPolymarketCallbacks(initMessenger);

      await callbacks.submitDepositWalletBatch({
        eoa: EOA_MOCK,
        depositWallet: DEPOSIT_WALLET_MOCK,
        calls: CALLS_MOCK,
      });

      const signer =
        executeDepositWalletBatchAndWaitForCompletionMock.mock.calls[0][0]
          .signer;

      const typedParams = {} as TypedMessageParams;
      const typedResult = await signer.signTypedMessage(
        typedParams,
        SignTypedDataVersion.V4,
      );
      const personalParams = {} as PersonalMessageParams;
      const personalResult = await signer.signPersonalMessage(personalParams);

      expect(typedResult).toBe('0xtyped');
      expect(personalResult).toBe('0xpersonal');
      expect(initMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        typedParams,
        SignTypedDataVersion.V4,
      );
      expect(initMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signPersonalMessage',
        personalParams,
      );
    });

    it('retries when the relayer reports "wallet busy" and eventually succeeds', async () => {
      executeDepositWalletBatchAndWaitForCompletionMock
        .mockRejectedValueOnce(new Error('wallet busy: try again'))
        .mockRejectedValueOnce(new Error('Wallet Busy: still pending'))
        .mockResolvedValueOnce(SOURCE_HASH_MOCK);

      const callbacks = createPolymarketCallbacks(buildInitMessenger());

      const promise = callbacks.submitDepositWalletBatch({
        eoa: EOA_MOCK,
        depositWallet: DEPOSIT_WALLET_MOCK,
        calls: CALLS_MOCK,
      });

      await jest.runAllTimersAsync();

      await expect(promise).resolves.toStrictEqual({
        sourceHash: SOURCE_HASH_MOCK,
      });
      expect(
        executeDepositWalletBatchAndWaitForCompletionMock,
      ).toHaveBeenCalledTimes(3);
    });

    it('rethrows non wallet-busy errors immediately without retrying', async () => {
      executeDepositWalletBatchAndWaitForCompletionMock.mockRejectedValue(
        new Error('relayer rejected'),
      );

      const callbacks = createPolymarketCallbacks(buildInitMessenger());

      await expect(
        callbacks.submitDepositWalletBatch({
          eoa: EOA_MOCK,
          depositWallet: DEPOSIT_WALLET_MOCK,
          calls: CALLS_MOCK,
        }),
      ).rejects.toThrow('relayer rejected');

      expect(
        executeDepositWalletBatchAndWaitForCompletionMock,
      ).toHaveBeenCalledTimes(1);
    });

    it('gives up after exhausting wallet-busy retries', async () => {
      executeDepositWalletBatchAndWaitForCompletionMock.mockRejectedValue(
        new Error('wallet busy: persistent'),
      );

      const callbacks = createPolymarketCallbacks(buildInitMessenger());

      const promise = callbacks.submitDepositWalletBatch({
        eoa: EOA_MOCK,
        depositWallet: DEPOSIT_WALLET_MOCK,
        calls: CALLS_MOCK,
      });

      const captured = promise.catch((error) => error);
      await jest.runAllTimersAsync();
      const error = await captured;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('wallet busy: persistent');
      expect(
        executeDepositWalletBatchAndWaitForCompletionMock,
      ).toHaveBeenCalledTimes(5);
    });
  });
});
