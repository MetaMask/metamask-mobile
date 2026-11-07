import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

/**
 * `@metamask/wallet` builds the TransactionController messenger, but no wallet
 * release delegates `SentinelApiService:simulateTransactions`, which
 * TransactionController 73 calls for every simulation. The app patches the
 * wallet package (`.yarn/patches/@metamask-wallet-*.patch`) to add it. This
 * test fails if the patch is dropped or no longer applies.
 */

interface TransactionControllerInstance {
  getMessenger: (
    parent: Messenger<MockAnyNamespace, never, never>,
  ) => Messenger<'TransactionController', never, never>;
}

function loadWalletTransactionControllerInstance(): TransactionControllerInstance {
  // The definition is not exported from the package entry point, so load it
  // from the installed package directory.
  const definitionPath = require
    .resolve('@metamask/wallet/package.json')
    .replace(
      /package\.json$/u,
      'dist/initialization/instances/transaction-controller/transaction-controller.js',
    );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transactionController } = require(definitionPath);
  return transactionController;
}

describe('@metamask/wallet TransactionController messenger', () => {
  it('delegates SentinelApiService:simulateTransactions', async () => {
    const rootMessenger = new Messenger<MockAnyNamespace, never, never>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const simulateTransactions = jest
      .fn()
      .mockResolvedValue({ transactions: [] });
    (
      rootMessenger as unknown as {
        registerActionHandler: (
          name: string,
          handler: (...args: unknown[]) => unknown,
        ) => void;
      }
    ).registerActionHandler(
      'SentinelApiService:simulateTransactions',
      simulateTransactions,
    );

    const transactionControllerMessenger =
      loadWalletTransactionControllerInstance().getMessenger(rootMessenger);

    const result = await (
      transactionControllerMessenger as unknown as {
        call: (name: string, ...args: unknown[]) => Promise<unknown>;
      }
    ).call('SentinelApiService:simulateTransactions', '0x89', {
      transactions: [],
    });

    expect(simulateTransactions).toHaveBeenCalledWith('0x89', {
      transactions: [],
    });
    expect(result).toStrictEqual({ transactions: [] });
  });
});
