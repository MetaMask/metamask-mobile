import { RootState } from '../../../reducers';
import { getTraceTags } from './';
import initialRootState, {
  backgroundState,
} from '../../../util/test/initial-root-state';
import { userInitialState } from '../../../reducers/user';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';

describe('Tags Utils', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getTraceTags', () => {
    it('includes if unlocked', () => {
      const state = {
        ...initialRootState,
        user: { ...userInitialState, userLoggedIn: true },
      };

      const tags = getTraceTags(state);

      expect(tags?.['wallet.unlocked']).toStrictEqual(true);
    });

    it('includes if not unlocked', () => {
      const state = {
        ...initialRootState,
        user: { ...userInitialState, userLoggedIn: false },
      };

      const tags = getTraceTags(state);

      expect(tags?.['wallet.unlocked']).toStrictEqual(false);
    });

    it('includes pending approval type', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            ApprovalController: {
              ...backgroundState.ApprovalController,
              pendingApprovals: {
                1: {
                  type: 'eth_sendTransaction',
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags?.['wallet.pending_approval']).toStrictEqual(
        'eth_sendTransaction',
      );
    });

    it('includes first pending approval type if multiple', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,

            ApprovalController: {
              ...backgroundState.ApprovalController,
              pendingApprovals: {
                1: {
                  type: 'eth_sendTransaction',
                },
                2: {
                  type: 'personal_sign',
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags?.['wallet.pending_approval']).toStrictEqual(
        'eth_sendTransaction',
      );
    });

    it('includes account count', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: createMockAccountsControllerState([
              '0x1234',
              '0x4321',
            ]),
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags?.['wallet.account_count']).toStrictEqual(2);
    });

    it('includes nft count', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            NftController: {
              ...backgroundState.NftController,
              allNfts: {
                '0x1234': {
                  '0x1': [
                    {
                      tokenId: '1',
                    },
                    {
                      tokenId: '2',
                    },
                  ],
                  '0x2': [
                    {
                      tokenId: '3',
                    },
                    {
                      tokenId: '4',
                    },
                  ],
                },
                '0x4321': {
                  '0x3': [
                    {
                      tokenId: '5',
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags?.['wallet.nft_count']).toStrictEqual(5);
    });

    it('includes notification count', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            NotificationServicesController: {
              metamaskNotificationsList: [{}, {}, {}],
            },
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags?.['wallet.notification_count']).toStrictEqual(3);
    });

    it('includes token count', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            TokensController: {
              allTokens: {
                '0x1': {
                  '0x1234': [{}, {}],
                  '0x4321': [{}],
                },
                '0x2': {
                  '0x5678': [{}],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags?.['wallet.token_count']).toStrictEqual(4);
    });

    it('includes transaction count', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            TransactionController: {
              transactions: [
                {
                  id: 1,
                  chainId: '0x1',
                },
                {
                  id: 2,
                  chainId: '0x1',
                },
                {
                  id: 3,
                  chainId: '0x2',
                },
              ],
            },
          },
        },
      } as unknown as RootState;
      const tags = getTraceTags(state);

      expect(tags?.['wallet.transaction_count']).toStrictEqual(3);
    });

    it('handles undefined pendingApprovals in ApprovalController', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            ApprovalController: {
              ...backgroundState.ApprovalController,
              pendingApprovals: undefined,
            },
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags?.['wallet.pending_approval']).toBeUndefined();
    });

    it('handles ApprovalController as an empty object', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            ApprovalController: {},
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags).toBeDefined();
      expect(tags?.['wallet.pending_approval']).toBeUndefined();
    });

    it('continues execution when individual tag collection fails', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: {
              get accounts() {
                throw new Error('Test error');
              },
            },
            TokensController: {
              allTokens: {
                '0x1': {
                  '0x1234': [{}, {}],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags?.['wallet.account_count']).toBeUndefined();
      expect(tags?.['wallet.token_count']).toBeDefined();
    });

    it('handles missing controllers gracefully', () => {
      const state = {
        ...initialRootState,
        engine: {
          backgroundState: {
            ...backgroundState,
            ApprovalController: undefined,
            NftController: undefined,
            TokensController: undefined,
          },
        },
      } as unknown as RootState;

      const tags = getTraceTags(state);

      expect(tags).toBeDefined();
      expect(tags['wallet.pending_approval']).toBeUndefined();
      expect(tags['wallet.nft_count']).toBeUndefined();
      expect(tags['wallet.token_count']).toBeUndefined();
    });
  });
});
