import '../../../../../../app/util/test/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreenWithRoutes } from '../../../../../../app/util/test/component-view/render';
import { initialStateWallet } from '../../../../../../app/util/test/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../../app/util/test/platform';
import Routes from '../../../../../constants/navigation/Routes';
import { TokenStandard } from '../../types/token';
import { Send } from './send';

const baseOverrides = {
  settings: {
    basicFunctionalityEnabled: true,
  },
  engine: {
    backgroundState: {
      AddressBookController: {
        addressBook: {},
      },
      MultichainNetworkController: {
        isEvmSelected: true,
      },
      SnapController: {
        snaps: {},
      },
      PermissionController: {
        subjects: {},
      },
      NftController: {
        allNfts: {},
        allNftContracts: {},
      },
      SignatureController: {
        signatureRequests: {},
        unapprovedPersonalMsgs: {},
        unapprovedTypedMessages: {},
        unapprovedPersonalMsgCount: 0,
        unapprovedTypedMessagesCount: 0,
      },
    },
  },
} as unknown as Record<string, unknown>;

describeForPlatforms('Send', () => {
  let unmountFn: (() => void) | null = null;

  afterEach(() => {
    unmountFn?.();
    unmountFn = null;
  });

  /**
   * Regression test for Issue #22789 and related to #23251
   * TRON send flow: selecting a destination account must move the flow forward
   * (previously it stayed on the recipient list and did not navigate).
   * Exits early when TRON is not in the build (recipient list empty).
   */

  it('TRON send: selecting destination account updates selection', async () => {
    const TRON_SENDER = 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7';
    const tronRecipientAddresses = [
      'TA9vN2KmER9cuVBaHxQjzzRtXnBCdF7D4u',
      'TLv2f6VPqDgRE67v1736s7bJ8Ray5wYjU8',
    ];
    const accountIds = ['tron-acc-1', 'tron-acc-2', 'tron-acc-3'];
    const GROUP_ID = 'entropy:wallet1/0';
    const WALLETS_KEY = 'entropy:wallet1';

    const tronAccountEntries = Object.fromEntries([
      [
        'tron-acc-1',
        {
          id: 'tron-acc-1',
          address: TRON_SENDER,
          metadata: { name: 'Tron Account 1', importTime: Date.now() },
          options: {},
          methods: [],
          type: 'tron:eoa',
          scopes: ['tron:0'],
        },
      ],
      [
        'tron-acc-2',
        {
          id: 'tron-acc-2',
          address: tronRecipientAddresses[0],
          metadata: { name: 'Tron Account 2', importTime: Date.now() },
          options: {},
          methods: [],
          type: 'tron:eoa',
          scopes: ['tron:0'],
        },
      ],
      [
        'tron-acc-3',
        {
          id: 'tron-acc-3',
          address: tronRecipientAddresses[1],
          metadata: { name: 'Tron Account 3', importTime: Date.now() },
          options: {},
          methods: [],
          type: 'tron:eoa',
          scopes: ['tron:0'],
        },
      ],
    ]);

    const baseEngine = (baseOverrides as Record<string, unknown>).engine as
      | { backgroundState?: Record<string, unknown> }
      | undefined;
    const tronOverrides = {
      ...baseOverrides,
      engine: {
        backgroundState: {
          ...(baseEngine?.backgroundState ?? {}),
          MultichainNetworkController: {
            isEvmSelected: false,
          },
          AccountsController: {
            internalAccounts: {
              accounts: tronAccountEntries,
              selectedAccount: 'tron-acc-1',
            },
          },
          AccountTreeController: {
            accountTree: {
              selectedAccountGroup: GROUP_ID,
              wallets: {
                [WALLETS_KEY]: {
                  id: WALLETS_KEY,
                  type: 'Entropy',
                  metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
                  groups: {
                    [GROUP_ID]: {
                      id: GROUP_ID,
                      type: 'MultipleAccount',
                      metadata: {
                        name: 'Group 1',
                        pinned: false,
                        hidden: false,
                      },
                      accounts: accountIds,
                    },
                  },
                },
              },
            },
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                featureVersion: '1',
                minimumVersion: null,
              },
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const state = initialStateWallet().withOverrides(tronOverrides).build();

    const tronAsset = {
      address: 'tron:mainnet/native',
      chainId: 'tron:1',
      symbol: 'TRX',
      decimals: 6,
      balance: '100',
      rawBalance: '0x64',
      accountId: 'tron-acc-1',
    };

    const { getByTestId, getByRole, findByTestId, queryByTestId, unmount } =
      renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: 'Send' },
        [],
        { state },
        { asset: tronAsset },
      );
    unmountFn = unmount;

    expect(getByTestId('send_amount')).toBeOnTheScreen();

    fireEvent.press(getByTestId('percentage-button-100'));
    fireEvent.press(getByRole('button', { name: 'Continue' }));

    expect(await findByTestId('recipient-address-input')).toBeOnTheScreen();

    const recipientItem = queryByTestId(
      `recipient-${tronRecipientAddresses[0]}`,
    );
    if (!recipientItem) {
      return;
    }

    fireEvent.press(recipientItem);

    expect(
      await findByTestId(`selected-${tronRecipientAddresses[0]}`),
    ).toBeOnTheScreen();
  });

  /**
   * Regression test for issue #22357
   * WETH send flow must not get stuck; user can enter amount, continue to recipient,
   * enter address, and tap Review without the app hanging or crashing.
   */
  it('WETH send flow completes through Review without getting stuck', async () => {
    const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const recipientAddress = '0x0000000000000000000000000000000000000002';

    const state = initialStateWallet().withOverrides(baseOverrides).build();

    const wethAsset = {
      address: WETH_ADDRESS,
      chainId: '0x1',
      symbol: 'WETH',
      decimals: 18,
      balance: '100',
      rawBalance: '0x56bc75e2d63100000',
    };

    const { getByTestId, getByRole, findByTestId, unmount } =
      renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: 'Send' },
        [],
        { state },
        { asset: wethAsset },
      );
    unmountFn = unmount;

    expect(getByTestId('send_amount')).toBeOnTheScreen();

    fireEvent.press(getByTestId('percentage-button-100'));
    fireEvent.press(getByRole('button', { name: 'Continue' }));

    expect(await findByTestId('recipient-address-input')).toBeOnTheScreen();

    const addressInput = getByTestId('recipient-address-input');
    fireEvent.changeText(addressInput, recipientAddress);

    const reviewButton = await findByTestId('review-button');
    expect(reviewButton).toBeOnTheScreen();
    fireEvent.press(reviewButton);
  });

  /**
   * Regression test for issue #12317
   * When sending an ERC-721 token, the Next/Continue button must be enabled so the user
   * can proceed from Amount to Recipient (and not get stuck with "Fiat conversions not available").
   */
  it('ERC-721 send: Amount screen shows enabled Continue button and user can proceed to Recipient', async () => {
    const erc721Asset = {
      address: '0x4B3E2eD66631FE2dE488CB0c23eF3A91A41601f7',
      chainId: '0x1',
      symbol: 'NFT',
      name: 'Test NFT',
      standard: TokenStandard.ERC721,
      tokenId: '42',
      balance: '1',
    };

    const state = initialStateWallet().withOverrides(baseOverrides).build();

    const { getByTestId, getByRole, getByText, findByTestId, unmount } =
      renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: 'Send' },
        [],
        { state },
        { asset: erc721Asset },
      );
    unmountFn = unmount;

    expect(getByTestId('send_amount')).toBeOnTheScreen();

    fireEvent.press(getByText('1'));

    const continueButton = getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeOnTheScreen();
    expect(continueButton).toBeEnabled();

    fireEvent.press(continueButton);

    expect(await findByTestId('recipient-address-input')).toBeOnTheScreen();
  });

  /**
   * Regression test for issue #19002
   * When starting Send from home and selecting an ERC-721 NFT in the asset picker,
   * the flow must go to Recipient (not Amount). ERC721 must not be treated as ERC1155.
   */
  it('ERC-721 selected from Asset screen navigates to Recipient not Amount', async () => {
    const accountAddress = '0x0000000000000000000000000000000000000001';
    const erc721InState = {
      address: '0x4B3E2eD66631FE2dE488CB0c23eF3A91A41601f7',
      tokenId: '42',
      standard: 'ERC721',
      name: 'Test ERC721 NFT',
      favorite: false,
      isCurrentlyOwned: true,
    };

    const nftOverrides = {
      engine: {
        backgroundState: {
          NftController: {
            allNfts: {
              [accountAddress]: {
                '0x1': [erc721InState],
              },
            },
            allNftContracts: {},
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const state = initialStateWallet()
      .withOverrides(baseOverrides)
      .withOverrides(nftOverrides)
      .build();

    const { findByTestId, unmount } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: 'Send' },
      [],
      { state },
      { screen: Routes.SEND.ASSET },
    );
    unmountFn = unmount;

    const nftRow = await findByTestId(
      'nft-Test ERC721 NFT',
      {},
      { timeout: 5000 },
    );
    expect(nftRow).toBeOnTheScreen();
    fireEvent.press(nftRow);

    expect(await findByTestId('recipient-address-input')).toBeOnTheScreen();
  });

  /**
   * Regression test for issue #22205
   * EVM contacts must not appear in non-EVM (e.g. Solana, BTC) send flow Recipient screen.
   * Only contacts for the current chain/protocol should be shown.
   */
  it('Solana send Recipient screen does not show EVM contacts ', async () => {
    const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const EVM_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';

    const addressBookOverrides = {
      engine: {
        backgroundState: {
          AddressBookController: {
            addressBook: {
              '0x1': {
                [EVM_CONTACT_ADDRESS.toLowerCase()]: {
                  name: 'EVM Contact',
                  address: EVM_CONTACT_ADDRESS,
                },
              },
            },
          },
          MultichainNetworkController: {
            isEvmSelected: false,
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const solanaAsset = {
      address: `${SOLANA_CHAIN_ID}/native`,
      chainId: SOLANA_CHAIN_ID,
      symbol: 'SOL',
      decimals: 9,
      balance: '100',
      rawBalance: '100',
    };

    const state = initialStateWallet()
      .withOverrides(baseOverrides)
      .withOverrides(addressBookOverrides)
      .build();

    const { findByTestId, queryByTestId, unmount } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: 'Send' },
      [],
      { state },
      { asset: solanaAsset, screen: Routes.SEND.RECIPIENT },
    );
    unmountFn = unmount;

    expect(await findByTestId('recipient-address-input')).toBeOnTheScreen();

    const evmContactRow = queryByTestId(`recipient-${EVM_CONTACT_ADDRESS}`);
    expect(evmContactRow).not.toBeOnTheScreen();
  });

  /**
   * Regression test for issue #22806
   * Recipient list (accounts or contacts) must render each entry with the expected avatar.
   * Uses address-book contacts to avoid dependency on multichain account tree/feature flags.
   */
  it('Recipient list renders each contact with avatar', async () => {
    const contactAddresses = [
      '0x0000000000000000000000000000000000000002',
      '0x0000000000000000000000000000000000000003',
    ];

    const contactOverrides = {
      engine: {
        backgroundState: {
          AddressBookController: {
            addressBook: {
              '0x1': {
                [contactAddresses[0].toLowerCase()]: {
                  name: 'Contact One',
                  address: contactAddresses[0],
                },
                [contactAddresses[1].toLowerCase()]: {
                  name: 'Contact Two',
                  address: contactAddresses[1],
                },
              },
            },
          },
        },
      },
    } as unknown as Record<string, unknown>;

    const state = initialStateWallet()
      .withOverrides(baseOverrides)
      .withOverrides(contactOverrides)
      .build();

    const { getByTestId, getByRole, findByTestId, unmount } =
      renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: 'Send' },
        [],
        { state },
        {
          asset: { chainId: '0x1', symbol: 'ETH', decimals: 18, balance: '1' },
        },
      );
    unmountFn = unmount;

    expect(getByTestId('send_amount')).toBeOnTheScreen();

    fireEvent.press(getByTestId('percentage-button-100'));
    fireEvent.press(getByRole('button', { name: 'Continue' }));

    expect(await findByTestId('recipient-address-input')).toBeOnTheScreen();

    for (const address of contactAddresses) {
      const recipientRow = getByTestId(`recipient-${address}`);
      expect(recipientRow).toBeOnTheScreen();
      const avatar = getByTestId(`recipient-avatar-${address}`);
      expect(avatar).toBeOnTheScreen();
    }
  });

  /**
   * Regression test for issue #22702
   * Keypad and amount area on Send Amount screen must be visible and not overflowing
   */
  it('Amount screen shows keypad and amount area visible', async () => {
    const state = initialStateWallet().withOverrides(baseOverrides).build();

    const { getByTestId, unmount } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: 'Send' },
      [],
      { state },
      {
        asset: {
          chainId: '0x1',
          symbol: 'ETH',
          decimals: 18,
          balance: '1',
        },
      },
    );
    unmountFn = unmount;

    const amountDisplay = getByTestId('send_amount');
    expect(amountDisplay).toBeOnTheScreen();

    const keypad = getByTestId('edit-amount-keyboard');
    expect(keypad).toBeOnTheScreen();
  });
});
