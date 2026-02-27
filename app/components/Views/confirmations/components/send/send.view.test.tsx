import '../../../../../../app/util/test/component-view/mocks';
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreenWithRoutes } from '../../../../../../app/util/test/component-view/render';
import {
  buildAddressBookOverridesWithEvmContact,
  buildTronSendFixture,
  sendViewOverrides,
} from '../../../../../../app/util/test/component-view/presets/send';
import { initialStateWallet } from '../../../../../../app/util/test/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../../app/util/test/platform';
import Routes from '../../../../../constants/navigation/Routes';
import { TokenStandard } from '../../types/token';
import {
  getNftRowTestId,
  getRecipientAvatarTestId,
  getRecipientRowTestId,
  getSelectedRecipientTestId,
  RedesignedSendViewSelectorsIDs,
} from './RedesignedSendView.testIds';
import { Send } from './send';

describeForPlatforms('Send', () => {
  /**
   * Regression test for Issue #22789 and related to #23251
   * TRON send flow: selecting a destination account must move the flow forward
   * (previously it stayed on the recipient list and did not navigate).
   */
  it('TRON send: selecting destination account updates selection', async () => {
    const { tronOverrides, recipientAddresses } = buildTronSendFixture();

    const state = initialStateWallet().withOverrides(tronOverrides).build();

    const TRON_MAINNET_CHAIN_ID = 'tron:728126428';

    const tronAsset = {
      address: `${TRON_MAINNET_CHAIN_ID}/native`,
      chainId: TRON_MAINNET_CHAIN_ID,
      symbol: 'TRX',
      decimals: 6,
      balance: '100',
      rawBalance: '0x64',
      accountId: 'tron-acc-1',
    };

    const { getByTestId, getByRole, findByTestId } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: Routes.SEND.DEFAULT },
      [],
      { state },
      { asset: tronAsset },
    );

    expect(
      getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(RedesignedSendViewSelectorsIDs.PERCENTAGE_BUTTON_100),
    );
    fireEvent.press(getByRole('button', { name: 'Continue' }));

    expect(
      await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
      ),
    ).toBeOnTheScreen();

    const recipientItem = await findByTestId(
      getRecipientRowTestId(recipientAddresses[0]),
      {},
      { timeout: 10000 },
    );
    fireEvent.press(recipientItem);

    expect(
      await findByTestId(
        getSelectedRecipientTestId(recipientAddresses[0]),
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
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

    const state = initialStateWallet().withOverrides(sendViewOverrides).build();

    const { getByTestId, getByRole, getByText, findByTestId } =
      renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [],
        { state },
        { asset: erc721Asset },
      );

    expect(
      getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
    ).toBeOnTheScreen();

    fireEvent.press(getByText('1'));

    const continueButton = getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeOnTheScreen();
    expect(continueButton).toBeEnabled();

    fireEvent.press(continueButton);

    expect(
      await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
      ),
    ).toBeOnTheScreen();
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
      .withOverrides(sendViewOverrides)
      .withOverrides(nftOverrides)
      .build();

    const { findByTestId } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: Routes.SEND.DEFAULT },
      [],
      { state },
      { screen: Routes.SEND.ASSET },
    );

    const nftRow = await findByTestId(
      getNftRowTestId('Test ERC721 NFT'),
      {},
      { timeout: 5000 },
    );
    expect(nftRow).toBeOnTheScreen();
    fireEvent.press(nftRow);

    expect(
      await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
      ),
    ).toBeOnTheScreen();
  });

  /**
   * Regression test for issue #22205
   * EVM contacts must not appear in non-EVM (e.g. Solana, BTC) send flow Recipient screen.
   * Only contacts for the current chain/protocol should be shown.
   */
  it('Solana send Recipient screen does not show EVM contacts ', async () => {
    const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const EVM_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';

    const addressBookOverrides =
      buildAddressBookOverridesWithEvmContact(EVM_CONTACT_ADDRESS);

    const solanaAsset = {
      address: `${SOLANA_CHAIN_ID}/native`,
      chainId: SOLANA_CHAIN_ID,
      symbol: 'SOL',
      decimals: 9,
      balance: '100',
      rawBalance: '100',
    };

    const state = initialStateWallet()
      .withOverrides(sendViewOverrides)
      .withOverrides(addressBookOverrides)
      .build();

    const { findByTestId, queryByTestId } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: Routes.SEND.DEFAULT },
      [],
      { state },
      { asset: solanaAsset, screen: Routes.SEND.RECIPIENT },
    );

    expect(
      await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
      ),
    ).toBeOnTheScreen();

    const evmContactRow = queryByTestId(
      getRecipientRowTestId(EVM_CONTACT_ADDRESS),
    );
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
      .withOverrides(sendViewOverrides)
      .withOverrides(contactOverrides)
      .build();

    const { getByTestId, getByRole, findByTestId } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: Routes.SEND.DEFAULT },
      [],
      { state },
      {
        asset: { chainId: '0x1', symbol: 'ETH', decimals: 18, balance: '1' },
      },
    );

    expect(
      getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(RedesignedSendViewSelectorsIDs.PERCENTAGE_BUTTON_100),
    );
    fireEvent.press(getByRole('button', { name: 'Continue' }));

    expect(
      await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
      ),
    ).toBeOnTheScreen();

    for (const address of contactAddresses) {
      const recipientRow = await waitFor(
        () => screen.getByTestId(getRecipientRowTestId(address)),
        { timeout: 5000 },
      );
      expect(recipientRow).toBeOnTheScreen();
      const avatar = getByTestId(getRecipientAvatarTestId(address));
      expect(avatar).toBeOnTheScreen();
    }
  });

  /**
   * Regression test for issue #22702
   * Keypad and amount area on Send Amount screen must be visible and not overflowing
   */
  it('Amount screen shows keypad and amount area visible', async () => {
    const state = initialStateWallet().withOverrides(sendViewOverrides).build();

    const { getByTestId } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: Routes.SEND.DEFAULT },
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

    const amountDisplay = getByTestId(
      RedesignedSendViewSelectorsIDs.SEND_AMOUNT,
    );
    expect(amountDisplay).toBeOnTheScreen();

    const keypad = getByTestId(
      RedesignedSendViewSelectorsIDs.EDIT_AMOUNT_KEYBOARD,
    );
    expect(keypad).toBeOnTheScreen();
  });
});
