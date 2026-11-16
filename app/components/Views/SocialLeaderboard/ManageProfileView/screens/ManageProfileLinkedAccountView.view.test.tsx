import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { renderManageProfileLinkedAccount } from '../../../../../../tests/component-view/renderers/socialLeaderboard';
import { ManageProfileLinkedAccountSelectorsIDs } from '../ManageProfileView.testIds';

const SECOND_ADDRESS = '0x0000000000000000000000000000000000000002';

describe('ManageProfileLinkedAccountView profile membership', () => {
  beforeEach(() => {
    jest.mocked(Engine.context.ProfileController.updateProfile).mockReset();
    jest
      .mocked(Engine.context.ProfileController.updateProfile)
      .mockResolvedValue(undefined);
  });

  it.each([
    ['unconfirmed secondary', 'secondary', true],
    ['non-mnemonic account', 'wallet1', false],
  ] as const)(
    'excludes a %s before the account tree hydrates',
    async (_name, entropyId, mnemonic) => {
      const { store } = renderManageProfileLinkedAccount({
        emptyAccountTree: true,
        overrides: {
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  accounts: {
                    'acc-1': {
                      options: {
                        entropy: {
                          type: 'mnemonic',
                          id: 'wallet1',
                          derivationPath: "m/44'/60'/0'/0/0",
                          groupIndex: 0,
                        },
                      },
                    },
                    'acc-2': {
                      id: 'acc-2',
                      address: SECOND_ADDRESS,
                      type: 'eip155:eoa',
                      scopes: ['eip155:0'],
                      methods: [],
                      options: mnemonic
                        ? {
                            entropy: {
                              type: 'mnemonic',
                              id: entropyId,
                              derivationPath: "m/44'/60'/0'/0/0",
                              groupIndex: 0,
                            },
                          }
                        : {},
                      metadata: {
                        name: 'Excluded account',
                        importTime: 2,
                        keyring: { type: 'HD Key Tree' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      await screen.findByTestId(
        `${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-acc-1`,
      );

      expect(
        store.getState().engine.backgroundState.AccountTreeController
          .accountTree.wallets,
      ).toEqual({});
      expect(
        screen.queryByTestId(
          `${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-acc-2`,
        ),
      ).not.toBeOnTheScreen();
    },
  );

  it('offers no fallback accounts when profile entropy is unknown', async () => {
    renderManageProfileLinkedAccount({
      emptyAccountTree: true,
      overrides: {
        engine: {
          backgroundState: {
            KeyringController: { keyrings: [] },
            AccountsController: {
              internalAccounts: {
                accounts: {
                  'acc-1': {
                    options: { entropy: { type: 'mnemonic', id: 'wallet1' } },
                  },
                },
              },
            },
          },
        },
      },
    });
    await screen.findByTestId(ManageProfileLinkedAccountSelectorsIDs.CONTAINER);

    expect(
      screen.queryAllByTestId(
        new RegExp(`^${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-`),
      ),
    ).toHaveLength(0);
  });

  it.each([true, false])(
    'uses confirmed pairing (%s), not matching canonical IDs',
    async (paired) => {
      renderManageProfileLinkedAccount({
        overrides: {
          engine: {
            backgroundState: {
              KeyringController: {
                keyrings: [
                  {
                    type: 'HD Key Tree',
                    accounts: [],
                    metadata: { id: 'primary', name: '' },
                  },
                ],
              },
              AuthenticationController: {
                srpSessionData: {
                  primary: {
                    profile: {
                      identifierId: 'primary-identifier',
                      canonicalProfileId: 'canonical',
                      pairedIdentifierIds: paired
                        ? [{ id: 'secondary-identifier', type: 'SRP' }]
                        : [],
                    },
                  },
                  wallet1: {
                    profile: {
                      identifierId: 'secondary-identifier',
                      canonicalProfileId: 'canonical',
                    },
                  },
                },
              },
            },
          },
        },
      });

      await screen.findByTestId(
        ManageProfileLinkedAccountSelectorsIDs.CONTAINER,
      );

      const rowId = `${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-acc-1`;
      if (paired) {
        fireEvent.press(await screen.findByTestId(rowId));

        await waitFor(() => {
          expect(
            Engine.context.ProfileController.updateProfile,
          ).toHaveBeenCalledWith({
            linked_addresses: [
              'eip155:1:0x0000000000000000000000000000000000000001',
            ],
          });
        });
      } else {
        expect(screen.queryByTestId(rowId)).not.toBeOnTheScreen();
        expect(
          Engine.context.ProfileController.updateProfile,
        ).not.toHaveBeenCalled();
      }
    },
  );
});
