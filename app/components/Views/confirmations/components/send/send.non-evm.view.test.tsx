import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreenWithRoutes } from '../../../../../../tests/component-view/render';
import {
  buildAddressBookOverridesWithEvmContact,
  buildNonEvmSendAccountsOverrides,
  buildTronSendFixture,
  NON_EVM_BTC_ACCOUNT_ID,
  NON_EVM_SOLANA_ACCOUNT_ID,
  sendViewOverrides,
} from '../../../../../../tests/component-view/presets/send';
import { initialStateWallet } from '../../../../../../tests/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import Routes from '../../../../../constants/navigation/Routes';
import {
  getRecipientRowTestId,
  getSelectedRecipientTestId,
  RedesignedSendViewSelectorsIDs,
} from './RedesignedSendView.testIds';
import { Send } from './send';
import { HardwareWalletProvider } from '../../../../../core/HardwareWallet/HardwareWalletProvider';
import {
  clearSnapControllerHandleRequestMock,
  setupSnapControllerHandleRequestMock,
} from '../../../../../../tests/component-view/helpers/snapRequests';

const BTC_MAINNET_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93' as const;

const SOLANA_MAINNET_CHAIN_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;

const TRON_MAINNET_CHAIN_ID = 'tron:728126428' as const;

const NON_EVM_NETWORK_OVERRIDE = {
  engine: {
    backgroundState: {
      MultichainNetworkController: {
        isEvmSelected: false,
      },
    },
  },
} as unknown as Record<string, unknown>;

/** Native SOL (smoke `send-solana-token` / non-EVM send tests). */
const SOLANA_NATIVE_ASSET = {
  address: `${SOLANA_MAINNET_CHAIN_ID}/native`,
  chainId: SOLANA_MAINNET_CHAIN_ID,
  symbol: 'SOL',
  decimals: 9,
  balance: '100',
  rawBalance: '100',
};

const SOLANA_NATIVE_ASSET_SEND_FIVE = {
  ...SOLANA_NATIVE_ASSET,
  balance: '10',
  rawBalance: '10000000000',
  accountId: NON_EVM_SOLANA_ACCOUNT_ID,
};

const BTC_NATIVE_ASSET_SEND_FIVE = {
  address: `${BTC_MAINNET_CHAIN_ID}/slip44:0`,
  chainId: BTC_MAINNET_CHAIN_ID,
  symbol: 'BTC',
  decimals: 8,
  balance: '10',
  rawBalance: '0x3B9ACA00', // 10 BTC in sats
  isNative: true,
  accountId: NON_EVM_BTC_ACCOUNT_ID,
};

/** Native BTC with 1 satoshi on-chain balance — any full-unit input exceeds it. */
const MINIMAL_BTC_BALANCE_ASSET = {
  address: `${BTC_MAINNET_CHAIN_ID}/slip44:0`,
  chainId: BTC_MAINNET_CHAIN_ID,
  symbol: 'BTC',
  decimals: 8,
  balance: '0.00000001',
  rawBalance: '0x1',
  isNative: true,
};

const TRON_NATIVE_ASSET_SEND_FIVE = {
  address: `${TRON_MAINNET_CHAIN_ID}/native`,
  chainId: TRON_MAINNET_CHAIN_ID,
  symbol: 'TRX',
  decimals: 6,
  balance: '10',
  rawBalance: '0x989680', // 10 TRX in sun
  accountId: 'tron-acc-1',
};

const VALID_SOLANA_RECIPIENT = '11111111111111111111111111111111';
const VALID_BTC_RECIPIENT = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

function SendFlowWithHardwareWalletProvider() {
  return (
    <HardwareWalletProvider>
      <Send />
    </HardwareWalletProvider>
  );
}

describeForPlatforms('Send (Non-EVM)', () => {
  let snapHandleRequestSpy: jest.SpyInstance;

  beforeEach(() => {
    snapHandleRequestSpy = setupSnapControllerHandleRequestMock({
      onAmountInputResponse: { valid: true, errors: [] },
      confirmSendResponse: { valid: true },
    });
  });

  afterEach(() => {
    clearSnapControllerHandleRequestMock();
  });

  // Regression test for Issue #22789 and related to #23251
  // TRON send flow: selecting a destination account must move the flow forward
  // (previously it stayed on the recipient list and did not navigate).
  it('TRON send: selecting destination account updates selection', async () => {
    const { tronOverrides, recipientAddresses } = buildTronSendFixture();

    const state = initialStateWallet().withOverrides(tronOverrides).build();

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
      { screen: Routes.SEND.AMOUNT, params: { asset: tronAsset } },
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
   * Regression test for issue #22205
   * EVM contacts must not appear in non-EVM (e.g. Solana, BTC) send flow Recipient screen.
   * Only contacts for the current chain/protocol should be shown.
   */
  it('Solana send Recipient screen does not show EVM contacts', async () => {
    const EVM_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';

    const addressBookOverrides =
      buildAddressBookOverridesWithEvmContact(EVM_CONTACT_ADDRESS);

    const state = initialStateWallet()
      .withOverrides(sendViewOverrides)
      .withOverrides(addressBookOverrides)
      .build();

    const { findByTestId, queryByTestId } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: Routes.SEND.DEFAULT },
      [],
      { state },
      {
        screen: Routes.SEND.RECIPIENT,
        params: { asset: SOLANA_NATIVE_ASSET },
      },
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
   * Smoke `send-solana-token`: Amount screen shows the Send header title and SOL
   * symbol (same text checks as E2E; no transfer).
   */
  it('Solana native: Amount screen shows Send title and SOL', async () => {
    const state = initialStateWallet()
      .withOverrides(sendViewOverrides)
      .withOverrides(NON_EVM_NETWORK_OVERRIDE)
      .build();

    const { getByTestId } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: Routes.SEND.DEFAULT },
      [],
      { state },
      { screen: Routes.SEND.AMOUNT, params: { asset: SOLANA_NATIVE_ASSET } },
    );

    expect(
      getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
    ).toBeOnTheScreen();
    // Title and/or other copy may repeat "Send" — mirror E2E "text displayed" checks
    expect(screen.getAllByText('Send').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SOL').length).toBeGreaterThanOrEqual(1);
  });

  it('Solana native: digit 5 submits and opens transfer confirmation route', async () => {
    const state = initialStateWallet()
      .withOverrides(sendViewOverrides)
      .withOverrides(NON_EVM_NETWORK_OVERRIDE)
      .withOverrides(buildNonEvmSendAccountsOverrides())
      .build();

    const { getByTestId, getByText, getByRole, findByTestId } =
      renderScreenWithRoutes(
        SendFlowWithHardwareWalletProvider as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [{ name: Routes.TRANSACTIONS_VIEW }],
        { state },
        {
          screen: Routes.SEND.AMOUNT,
          params: { asset: SOLANA_NATIVE_ASSET_SEND_FIVE },
        },
      );

    expect(
      getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
    ).toBeOnTheScreen();

    fireEvent.press(getByText('5'));

    const continueButton = getByRole('button', { name: 'Continue' });
    await waitFor(() => expect(continueButton).toBeEnabled(), {
      timeout: 5000,
    });
    fireEvent.press(continueButton);

    const recipientInput = await findByTestId(
      RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
      {},
      { timeout: 5000 },
    );
    fireEvent.changeText(recipientInput, VALID_SOLANA_RECIPIENT);

    const reviewButton = await findByTestId(
      RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
      {},
      { timeout: 5000 },
    );
    await waitFor(() => expect(reviewButton).toBeEnabled(), {
      timeout: 5000,
    });
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(snapHandleRequestSpy).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        expect.objectContaining({
          request: expect.objectContaining({ method: 'confirmSend' }),
        }),
      );
    });

    expect(await findByTestId('route-TransactionsView')).toBeOnTheScreen();
  }, 20000);

  /**
   * Bitcoin send Amount: entering an amount above balance shows “Insufficient funds”
   * on Continue (input validation only; no transaction). Aligns with smoke
   * `send-btc-token` insufficient-funds coverage.
   */
  it('Bitcoin Amount: exceeding balance shows Insufficient funds', async () => {
    const state = initialStateWallet()
      .withOverrides(sendViewOverrides)
      .withOverrides(NON_EVM_NETWORK_OVERRIDE)
      .build();

    const { getByTestId, getByText, findByRole } = renderScreenWithRoutes(
      Send as unknown as React.ComponentType,
      { name: Routes.SEND.DEFAULT },
      [],
      { state },
      {
        screen: Routes.SEND.AMOUNT,
        params: { asset: MINIMAL_BTC_BALANCE_ASSET },
      },
    );

    expect(
      getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
    ).toBeOnTheScreen();

    // One satoshi balance; keypad "1" is 1 BTC — far exceeds balance
    fireEvent.press(getByText('1'));

    expect(
      await findByRole(
        'button',
        { name: 'Insufficient funds' },
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();
  });

  it('Bitcoin native: digit 5 submits and opens transfer confirmation route', async () => {
    const state = initialStateWallet()
      .withOverrides(sendViewOverrides)
      .withOverrides(NON_EVM_NETWORK_OVERRIDE)
      .withOverrides(buildNonEvmSendAccountsOverrides())
      .build();

    const { getByTestId, getByText, getByRole, findByTestId } =
      renderScreenWithRoutes(
        SendFlowWithHardwareWalletProvider as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [{ name: Routes.TRANSACTIONS_VIEW }],
        { state },
        {
          screen: Routes.SEND.AMOUNT,
          params: { asset: BTC_NATIVE_ASSET_SEND_FIVE },
        },
      );

    expect(
      getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
    ).toBeOnTheScreen();

    fireEvent.press(getByText('5'));

    const continueButton = getByRole('button', { name: 'Continue' });
    await waitFor(() => expect(continueButton).toBeEnabled(), {
      timeout: 5000,
    });
    fireEvent.press(continueButton);

    const recipientInput = await findByTestId(
      RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
      {},
      { timeout: 5000 },
    );
    fireEvent.changeText(recipientInput, VALID_BTC_RECIPIENT);

    const reviewButton = await findByTestId(
      RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
      {},
      { timeout: 5000 },
    );
    await waitFor(() => expect(reviewButton).toBeEnabled(), {
      timeout: 5000,
    });
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(snapHandleRequestSpy).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        expect.objectContaining({
          request: expect.objectContaining({ method: 'confirmSend' }),
        }),
      );
    });

    expect(await findByTestId('route-TransactionsView')).toBeOnTheScreen();
  }, 20000);

  it('TRON native: digit 5 submits and opens transfer confirmation route', async () => {
    const { tronOverrides, recipientAddresses } = buildTronSendFixture();
    const state = initialStateWallet().withOverrides(tronOverrides).build();

    const { getByTestId, getByText, getByRole, findByTestId } =
      renderScreenWithRoutes(
        SendFlowWithHardwareWalletProvider as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [{ name: Routes.TRANSACTIONS_VIEW }],
        { state },
        {
          screen: Routes.SEND.AMOUNT,
          params: { asset: TRON_NATIVE_ASSET_SEND_FIVE },
        },
      );

    expect(
      getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
    ).toBeOnTheScreen();

    fireEvent.press(getByText('5'));

    const continueButton = getByRole('button', { name: 'Continue' });
    await waitFor(() => expect(continueButton).toBeEnabled(), {
      timeout: 5000,
    });
    fireEvent.press(continueButton);

    const recipientInput = await findByTestId(
      RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
      {},
      { timeout: 5000 },
    );
    fireEvent.changeText(recipientInput, recipientAddresses[0]);

    const reviewButton = await findByTestId(
      RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
      {},
      { timeout: 5000 },
    );
    await waitFor(() => expect(reviewButton).toBeEnabled(), {
      timeout: 5000,
    });
    fireEvent.press(reviewButton);

    await waitFor(() => {
      expect(snapHandleRequestSpy).toHaveBeenCalledWith(
        'SnapController:handleRequest',
        expect.objectContaining({
          request: expect.objectContaining({ method: 'confirmSend' }),
        }),
      );
    });

    expect(await findByTestId('route-TransactionsView')).toBeOnTheScreen();
  }, 20000);
});
