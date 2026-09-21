import { NotificationTransactionTypes } from '../util/notifications';

import NotificationManager, {
  IN_PROGRESS_SKIP_STATUS,
  SKIP_NOTIFICATION_TRANSACTION_TYPES,
  clearNotificationSkipPredicates,
  constructTitleAndMessage,
  registerNotificationSkipPredicate,
} from './NotificationManager';
import { strings } from '../../locales/i18n';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller';
import Engine from './Engine';
import {
  TransactionController,
  TransactionControllerState,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

interface NavigationMock {
  navigate: jest.Mock;
}

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.unmock('./NotificationManager');

jest.useFakeTimers();

const mockNavigate: jest.Mock = jest.fn();
const mockNavigation: NavigationMock = {
  navigate: mockNavigate,
};

const showTransactionNotification = jest.fn();
const hideCurrentNotification = jest.fn();
const showSimpleNotification = jest.fn();
const removeNotificationById = jest.fn();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notificationManager: any;

describe('NotificationManager', () => {
  beforeEach(() => {
    notificationManager = NotificationManager.init({
      navigation: mockNavigation,
      showTransactionNotification,
      hideCurrentNotification,
      showSimpleNotification,
      removeNotificationById,
    });
  });

  it('calling NotificationManager.init returns an instance of NotificationManager', () => {
    expect(notificationManager).toStrictEqual(notificationManager);
  });

  it('calling NotificationManager in background mode should be truthy', () => {
    notificationManager._handleAppStateChange('background');
    expect(notificationManager._backgroundMode).toBe(true);
  });

  it('calling NotificationManager in _failedCallback mode should call _showNotification', () => {
    notificationManager._failedCallback({
      id: 1,
      txParams: {
        nonce: 1,
      },
    });
    expect(notificationManager._showNotification).toBeInstanceOf(Function);
  });

  it('calling NotificationManager onMessageReceived', () => {
    notificationManager.onMessageReceived({
      data: {
        title: 'title',
        shortDescription: 'shortDescription',
      },
    });
    expect(notificationManager.onMessageReceived).toBeInstanceOf(Function);
  });

  it('calling NotificationManager in background mode OFF should be falsy', () => {
    notificationManager._handleAppStateChange('active');
    expect(notificationManager._backgroundMode).toBe(false);
  });

  it('calling NotificationManager.showSimpleNotification with dada should be truthy', () => {
    expect(
      NotificationManager.showSimpleNotification({
        duration: 5000,
        title: 'Simple Notification',
        description: 'Simple Notification Description',
        action: 'tx',
      }),
    ).toBeTruthy();
  });

  it('calling NotificationManager.getTransactionToView should be falsy if setTransactionToView was not called before', () => {
    expect(NotificationManager.getTransactionToView()).toBeFalsy();
  });

  it('calling NotificationManager.getTransactionToView should be truthy if setTransactionToView was called before', () => {
    NotificationManager.setTransactionToView(1);
    expect(NotificationManager.getTransactionToView()).toBeTruthy();
  });

  const selectedNotificationTypes: (keyof typeof NotificationTransactionTypes)[] =
    [
      'pending',
      'pending_deposit',
      'pending_withdrawal',
      'success_withdrawal',
      'success_deposit',
      'error',
      'cancelled',
    ];
  selectedNotificationTypes.forEach((type) => {
    it(`constructs title and message for ${type}`, () => {
      const { title, message } = constructTitleAndMessage({
        type: NotificationTransactionTypes[type],
      });

      expect(title).toBe(strings(`notifications.${type}_title`));
      expect(message).toBe(strings(`notifications.${type}_message`));
    });

    it('constructs default title and message for unknown type', () => {
      const { title, message } = constructTitleAndMessage({
        type: 'unknown',
      });

      expect(title).toBe(strings('notifications.default_message_title'));
      expect(message).toBe(
        strings('notifications.default_message_description'),
      );
    });
  });

  describe('constructTitleAndMessage - EIP-7702 transactions (without nonce)', () => {
    it('constructs success title without nonce for EIP-7702 transactions', () => {
      const { title, message } = constructTitleAndMessage({
        type: NotificationTransactionTypes.success,
        transaction: {
          id: '0x123',
          // nonce is intentionally undefined for EIP-7702 transactions
        },
      });

      const expectedTitle = strings('notifications.success_title', {
        nonce: '',
      })
        .replace(' # ', ' ')
        .trim();

      expect(title).toBe(expectedTitle);
      expect(message).toBe(strings('notifications.success_message'));
    });

    it('constructs success title with nonce when nonce exists', () => {
      const { title, message } = constructTitleAndMessage({
        type: NotificationTransactionTypes.success,
        transaction: {
          id: '0x123',
          nonce: '3',
        },
      });

      expect(title).toBe(
        strings('notifications.success_title', { nonce: '3' }),
      );
      expect(message).toBe(strings('notifications.success_message'));
    });

    it('constructs speedup title without nonce for EIP-7702 transactions', () => {
      const { title, message } = constructTitleAndMessage({
        type: NotificationTransactionTypes.speedup,
        transaction: {
          id: '0x123',
          // nonce is intentionally undefined for EIP-7702 transactions
        },
      });

      const expectedTitle = strings('notifications.speedup_title', {
        nonce: '',
      })
        .replace(' #', '')
        .trim();

      expect(title).toBe(expectedTitle);
      expect(message).toBe(strings('notifications.speedup_message'));
    });

    it('constructs speedup title with nonce when nonce exists', () => {
      const { title, message } = constructTitleAndMessage({
        type: NotificationTransactionTypes.speedup,
        transaction: {
          id: '0x123',
          nonce: '5',
        },
      });

      expect(title).toBe(
        strings('notifications.speedup_title', { nonce: '5' }),
      );
      expect(message).toBe(strings('notifications.speedup_message'));
    });
  });

  describe('controller events', () => {
    const mockTransactionController = {
      getTransactions: jest.fn(),
    } as unknown as jest.Mocked<TransactionController>;

    const mockControllerMessenger = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      subscribeOnceIf: jest.fn(),
      tryUnsubscribe: jest.fn(),
    };

    const mockNetworkController = {
      findNetworkClientIdByChainId: jest.fn(),
    };

    const mockAssetsController = {
      getAssets: jest.fn().mockResolvedValue(undefined),
    };

    const mockAccountsController = {
      getAccountByAddress: jest.fn().mockReturnValue({ id: 'account-id' }),
    };

    let showNotificationSpy: jest.SpyInstance;

    beforeAll(() => {
      // Set up spies and mocks once before all tests
      Object.defineProperty(Engine, 'context', {
        value: {
          AssetsController: mockAssetsController,
          AccountsController: mockAccountsController,
          NetworkController: mockNetworkController,
          TransactionController: mockTransactionController,
        },
        writable: true,
      });

      Object.defineProperty(Engine, 'controllerMessenger', {
        value: mockControllerMessenger,
        writable: true,
      });
    });

    beforeEach(() => {
      // Clear all mock interactions before each test
      jest.clearAllMocks();

      // Reset the notification manager before each test
      notificationManager = NotificationManager.init({
        navigation: mockNavigation,
        showTransactionNotification,
        hideCurrentNotification,
        showSimpleNotification,
        removeNotificationById,
      });

      // Create spy on the instance method
      showNotificationSpy = jest.spyOn(
        notificationManager,
        '_showNotification',
      );

      mockTransactionController.state = {
        transactions: [
          {
            id: '0x123',
            txParams: {
              nonce: '0x1',
              from: '0x123',
            },
            chainId: '0x1',
            time: 123,
            status: 'failed' as TransactionMeta['status'],
            error: { message: 'test error', rpc: { code: 0 }, name: 'Error' },
          },
        ],
      } as unknown as TransactionControllerState;
    });

    afterAll(() => {
      // Clean up spy after all tests are done
      showNotificationSpy.mockRestore();
    });

    it('shows a notification for a pending smart transaction', async () => {
      const transaction = {
        status: SmartTransactionStatuses.PENDING,
        transactionId: '0x123',
      };

      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      // Get the subscriber callback
      const subscriberCallback =
        mockControllerMessenger.subscribe.mock.calls[0][1];
      await subscriberCallback(transaction);

      expect(showNotificationSpy).toHaveBeenCalledWith({
        type: 'pending',
        autoHide: false,
        transaction: { id: '0x123' },
      });
    });

    it('shows a cancelled notification for cancelled smart transactions', async () => {
      const mockTransaction = {
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
      };
      mockTransactionController.getTransactions.mockReturnValue([
        mockTransaction as unknown as TransactionMeta,
      ]);

      const smartTransaction = {
        status: SmartTransactionStatuses.CANCELLED,
        transactionId: '0x123',
      };

      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      // Get the subscriber callback
      const subscriberCallback =
        mockControllerMessenger.subscribe.mock.calls[0][1];
      await subscriberCallback(smartTransaction);

      expect(showNotificationSpy).toHaveBeenCalledWith({
        type: 'cancelled',
        autoHide: true,
        transaction: { id: '0x123' },
        duration: 5000,
      });
    });

    it('unsubscribes from smart transaction events when status is not pending', async () => {
      const transaction = {
        status: SmartTransactionStatuses.SUCCESS,
        transactionId: '0x123',
      };

      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      // Get the subscriber callback
      const subscriberCallback =
        mockControllerMessenger.subscribe.mock.calls[0][1];
      await subscriberCallback(transaction);

      expect(mockControllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'SmartTransactionsController:smartTransaction',
        subscriberCallback,
      );
    });

    it('sets up transaction event listeners correctly', () => {
      const transaction = {
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      };

      notificationManager.watchSubmittedTransaction(transaction);

      expect(mockControllerMessenger.subscribeOnceIf).toHaveBeenCalledTimes(3);
      expect(mockControllerMessenger.subscribeOnceIf).toHaveBeenCalledWith(
        'TransactionController:transactionConfirmed',
        expect.any(Function),
        expect.any(Function),
      );
      expect(mockControllerMessenger.subscribeOnceIf).toHaveBeenCalledWith(
        'TransactionController:transactionFailed',
        expect.any(Function),
        expect.any(Function),
      );
      expect(mockControllerMessenger.subscribeOnceIf).toHaveBeenCalledWith(
        'TransactionController:speedupTransactionAdded',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('shows a submit notification for a transaction', async () => {
      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pending',
        }),
      );
    });

    it('shows a confirm notification for a transaction with nonce', async () => {
      const transactionMeta = {
        id: '0x123',
        txParams: { nonce: '0x1', from: '0xSender' },
        chainId: '0x1',
        time: 123,
        status: 'confirmed' as TransactionMeta['status'],
      };

      mockTransactionController.state.transactions.push(
        transactionMeta as unknown as TransactionMeta,
      );

      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      const subscribeCallback =
        mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

      subscribeCallback(transactionMeta, {
        id: '0x123',
        assetType: 'ETH',
      });

      jest.advanceTimersByTime(2000);

      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          transaction: expect.objectContaining({
            id: '0x123',
            nonce: expect.any(String),
          }),
        }),
      );

      // The post-confirmation refresh must use a CAIP chain ID:
      // AssetsController.getAssets expects `chainIds: CaipChainId[]`, not the
      // transaction's raw hex chainId.
      expect(mockAssetsController.getAssets).toHaveBeenCalledWith(
        [{ id: 'account-id' }],
        expect.objectContaining({
          chainIds: ['eip155:1'],
        }),
      );
    });

    it('refreshes both the sender and recipient when the recipient is also a wallet account', async () => {
      const senderAccount = { id: 'sender-account-id' };
      const recipientAccount = { id: 'recipient-account-id' };
      mockAccountsController.getAccountByAddress.mockImplementation(
        (address: string) => {
          if (address === '0xSender') {
            return senderAccount;
          }
          if (address === '0xRecipient') {
            return recipientAccount;
          }
          return undefined;
        },
      );

      const transactionMeta = {
        id: '0x123',
        txParams: {
          nonce: '0x1',
          from: '0xSender',
          to: '0xRecipient',
        },
        chainId: '0x1',
        time: 123,
        status: 'confirmed' as TransactionMeta['status'],
      };

      mockTransactionController.state.transactions.push(
        transactionMeta as unknown as TransactionMeta,
      );

      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      const subscribeCallback =
        mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

      subscribeCallback(transactionMeta, {
        id: '0x123',
        assetType: 'ETH',
      });

      jest.advanceTimersByTime(2000);

      // A send to another of the user's own accounts must refresh the
      // recipient's balance too, not just the sender's.
      expect(mockAssetsController.getAssets).toHaveBeenCalledWith(
        [senderAccount, recipientAccount],
        expect.objectContaining({
          chainIds: ['eip155:1'],
        }),
      );
    });

    it('decodes the real recipient from calldata for an ERC-20 transfer instead of using the token contract address', async () => {
      const senderAccount = { id: 'sender-account-id' };
      const tokenContractAccount = { id: 'token-contract-account-id' };
      const realRecipientAccount = { id: 'real-recipient-account-id' };
      const tokenContractAddress = '0xTokenContract';
      const realRecipientAddress = '0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589a0';

      mockAccountsController.getAccountByAddress.mockImplementation(
        (address: string) => {
          if (address === '0xSender') {
            return senderAccount;
          }
          if (address === tokenContractAddress) {
            return tokenContractAccount;
          }
          if (address.toLowerCase() === realRecipientAddress.toLowerCase()) {
            return realRecipientAccount;
          }
          return undefined;
        },
      );

      const transactionMeta = {
        id: '0x123',
        type: TransactionType.tokenMethodTransfer,
        txParams: {
          nonce: '0x1',
          from: '0xSender',
          // `to` is the token contract for an ERC-20 transfer, not the
          // recipient — the real recipient is only in `data`.
          to: tokenContractAddress,
          data: '0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001',
        },
        chainId: '0x1',
        time: 123,
        status: 'confirmed' as TransactionMeta['status'],
      };

      mockTransactionController.state.transactions.push(
        transactionMeta as unknown as TransactionMeta,
      );

      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      const subscribeCallback =
        mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

      subscribeCallback(transactionMeta, {
        id: '0x123',
        assetType: 'ERC20',
      });

      jest.advanceTimersByTime(2000);

      // Must refresh the sender and the decoded real recipient, and must
      // NOT refresh the token contract "account" (getAccountByAddress would
      // return undefined for it anyway, but this pins the intended
      // behavior).
      expect(mockAssetsController.getAssets).toHaveBeenCalledWith(
        [senderAccount, realRecipientAccount],
        expect.objectContaining({
          chainIds: ['eip155:1'],
        }),
      );
      expect(mockAssetsController.getAssets).not.toHaveBeenCalledWith(
        expect.arrayContaining([tokenContractAccount]),
        expect.anything(),
      );
    });

    it('refreshes the sender and recipient for a native token transfer', async () => {
      const senderAccount = { id: 'sender-account-id' };
      const recipientAccount = { id: 'recipient-account-id' };

      mockAccountsController.getAccountByAddress.mockImplementation(
        (address: string) => {
          if (address === '0xSender') {
            return senderAccount;
          }
          if (address === '0xRecipient') {
            return recipientAccount;
          }
          return undefined;
        },
      );

      const transactionMeta = {
        id: '0x124',
        txParams: {
          nonce: '0x2',
          from: '0xSender',
          to: '0xRecipient',
        },
        chainId: '0x1',
        time: 124,
        status: 'confirmed' as TransactionMeta['status'],
      };

      mockTransactionController.state.transactions.push(
        transactionMeta as unknown as TransactionMeta,
      );

      notificationManager.watchSubmittedTransaction({
        id: '0x124',
        txParams: {
          nonce: '0x2',
        },
        silent: false,
      });

      const subscribeCallback =
        mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

      subscribeCallback(transactionMeta, {
        id: '0x124',
        assetType: 'ETH',
      });

      jest.advanceTimersByTime(2000);

      expect(mockAssetsController.getAssets).toHaveBeenCalledWith(
        [senderAccount, recipientAccount],
        expect.objectContaining({
          chainIds: ['eip155:1'],
        }),
      );
    });

    it('shows a confirm notification for EIP-7702 transaction without nonce', async () => {
      const eip7702TransactionMeta = {
        id: '0x456',
        txParams: {
          // nonce is intentionally undefined for EIP-7702 transactions
        },
        chainId: '0x1',
        time: 123,
        status: 'confirmed' as TransactionMeta['status'],
      };

      // Add EIP-7702 transaction to controller state
      mockTransactionController.state.transactions.push(
        eip7702TransactionMeta as unknown as TransactionMeta,
      );

      const originalTransaction = {
        id: '0x456',
        assetType: 'ETH',
      };

      notificationManager.watchSubmittedTransaction({
        id: '0x456',
        txParams: {
          // nonce is intentionally undefined for EIP-7702 transactions
        },
        silent: false,
      });

      const subscribeCallback =
        mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

      subscribeCallback(eip7702TransactionMeta, originalTransaction);

      jest.advanceTimersByTime(2000);

      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          autoHide: true,
          transaction: expect.objectContaining({
            id: '0x456',
            nonce: undefined,
          }),
          duration: 5000,
        }),
      );
    });

    it('shows a confirm notification for transaction with null nonce', async () => {
      const transactionWithNullNonce = {
        id: '0x789',
        txParams: {
          nonce: null,
        },
        chainId: '0x1',
        time: 123,
        status: 'confirmed' as TransactionMeta['status'],
      };

      mockTransactionController.state.transactions.push(
        transactionWithNullNonce as unknown as TransactionMeta,
      );

      notificationManager.watchSubmittedTransaction({
        id: '0x789',
        txParams: {
          nonce: null,
        },
        silent: false,
      });

      const subscribeCallback =
        mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

      subscribeCallback(transactionWithNullNonce, {
        id: '0x789',
        assetType: 'ETH',
      });

      jest.advanceTimersByTime(2000);

      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          transaction: expect.objectContaining({
            id: '0x789',
            nonce: undefined,
          }),
        }),
      );
    });

    it('shows a failed notification for a transaction', async () => {
      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      const subscribeCallback =
        mockControllerMessenger.subscribeOnceIf.mock.calls[1][1];

      subscribeCallback({
        id: '0x123',
        txParams: { nonce: '0x1' },
      });

      jest.advanceTimersByTime(2000);

      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        }),
      );
    });

    describe.each(SKIP_NOTIFICATION_TRANSACTION_TYPES)(
      'if transaction type is %s',
      (transactionType) => {
        it('does not show a submit notification', () => {
          mockTransactionController.state.transactions[0].type =
            transactionType;

          notificationManager.watchSubmittedTransaction({
            id: '0x123',
            txParams: {
              nonce: '0x1',
            },
            silent: false,
            type: transactionType,
          });

          expect(showNotificationSpy).not.toHaveBeenCalled();
        });

        it('does not show a confirm notification', () => {
          notificationManager.watchSubmittedTransaction({
            id: '0x123',
            txParams: {
              nonce: '0x1',
            },
            silent: false,
          });

          const subscribeCallback =
            mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

          subscribeCallback({
            id: '0x123',
            txParams: { nonce: '0x1' },
            type: transactionType,
          });

          jest.advanceTimersByTime(2000);

          expect(showNotificationSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'success',
            }),
          );
        });

        it('does not show a failed notification', () => {
          notificationManager.watchSubmittedTransaction({
            id: '0x123',
            txParams: {
              nonce: '0x1',
            },
            silent: false,
          });

          const subscribeCallback =
            mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

          subscribeCallback({
            id: '0x123',
            txParams: { nonce: '0x1' },
            type: transactionType,
          });

          jest.advanceTimersByTime(2000);

          expect(showNotificationSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
            }),
          );
        });
      },
    );

    describe.each(IN_PROGRESS_SKIP_STATUS)(
      'if perps deposit transaction exists with status of %s',
      (transactionStatus) => {
        beforeEach(() => {
          mockTransactionController.state.transactions.push({
            type: TransactionType.perpsDeposit,
            status: transactionStatus,
          } as unknown as TransactionMeta);
        });

        it('does not show submit confirmation', () => {
          notificationManager.watchSubmittedTransaction({
            id: '0x123',
            txParams: {
              nonce: '0x1',
            },
            silent: false,
          });

          expect(showNotificationSpy).not.toHaveBeenCalled();
        });

        it('does not show a confirm notification', () => {
          notificationManager.watchSubmittedTransaction({
            id: '0x123',
            txParams: {
              nonce: '0x1',
            },
            silent: false,
          });

          const subscribeCallback =
            mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

          subscribeCallback({
            id: '0x123',
            txParams: { nonce: '0x1' },
          });

          jest.advanceTimersByTime(2000);

          expect(showNotificationSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'success',
            }),
          );
        });

        it('does not show a failed notification', () => {
          notificationManager.watchSubmittedTransaction({
            id: '0x123',
            txParams: {
              nonce: '0x1',
            },
            silent: false,
          });

          const subscribeCallback =
            mockControllerMessenger.subscribeOnceIf.mock.calls[0][1];

          subscribeCallback({
            id: '0x123',
            txParams: { nonce: '0x1' },
          });

          jest.advanceTimersByTime(2000);

          expect(showNotificationSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'error',
            }),
          );
        });
      },
    );

    it('does not show a notification if required transaction', () => {
      mockTransactionController.state.transactions.push({
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: [
          mockTransactionController.state.transactions[0].id,
        ],
      } as unknown as TransactionMeta);

      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      expect(showNotificationSpy).not.toHaveBeenCalled();
    });

    it('does not show a notification if in batch with skipped', () => {
      const batchId = '0x123' as Hex;

      mockTransactionController.state.transactions.push({
        type: TransactionType.perpsDeposit,
        batchId,
      } as unknown as TransactionMeta);

      mockTransactionController.state.transactions[0].batchId = batchId;

      notificationManager.watchSubmittedTransaction({
        id: '0x123',
        txParams: {
          nonce: '0x1',
        },
        silent: false,
      });

      expect(showNotificationSpy).not.toHaveBeenCalled();
    });

    describe('notification skip predicates', () => {
      afterEach(() => {
        clearNotificationSkipPredicates();
      });

      it('does not show a notification when a registered predicate matches', () => {
        registerNotificationSkipPredicate(() => true);

        notificationManager.watchSubmittedTransaction({
          id: '0x123',
          txParams: { nonce: '0x1' },
          silent: false,
        });

        expect(showNotificationSpy).not.toHaveBeenCalled();
      });

      it('shows a notification when no registered predicate matches', () => {
        registerNotificationSkipPredicate(() => false);

        notificationManager.watchSubmittedTransaction({
          id: '0x123',
          txParams: { nonce: '0x1' },
          silent: false,
        });

        expect(showNotificationSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'pending' }),
        );
      });

      it('ignores a throwing predicate and still shows the notification', () => {
        registerNotificationSkipPredicate(() => {
          throw new Error('predicate boom');
        });

        notificationManager.watchSubmittedTransaction({
          id: '0x123',
          txParams: { nonce: '0x1' },
          silent: false,
        });

        expect(showNotificationSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'pending' }),
        );
      });

      it('passes the transaction meta to the predicate', () => {
        const predicate = jest.fn(() => false);
        registerNotificationSkipPredicate(predicate);

        notificationManager.watchSubmittedTransaction({
          id: '0x123',
          txParams: { nonce: '0x1' },
          silent: false,
        });

        expect(predicate).toHaveBeenCalledWith(
          expect.objectContaining({ id: '0x123' }),
        );
      });

      it('stops showing notifications only while the predicate is registered', () => {
        const unregister = registerNotificationSkipPredicate(() => true);
        unregister();

        notificationManager.watchSubmittedTransaction({
          id: '0x123',
          txParams: { nonce: '0x1' },
          silent: false,
        });

        expect(showNotificationSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'pending' }),
        );
      });
    });
  });
});
