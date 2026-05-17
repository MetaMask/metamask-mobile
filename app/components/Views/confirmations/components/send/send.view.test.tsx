import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreenWithRoutes } from '../../../../../../tests/component-view/render';
import { sendViewOverrides } from '../../../../../../tests/component-view/presets/send';
import { initialStateWallet } from '../../../../../../tests/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import Routes from '../../../../../constants/navigation/Routes';
import { TokenStandard } from '../../types/token';
import { HardwareWalletProvider } from '../../../../../core/HardwareWallet/HardwareWalletProvider';
import {
  getNftRowTestId,
  getRecipientAvatarTestId,
  getRecipientRowTestId,
  RedesignedSendViewSelectorsIDs,
} from './RedesignedSendView.testIds';
import { Send } from './send';
import { SendAlertModalSelectorIDs } from './send-alert-modal/send-alert-modal.testIds';
import { strings } from '../../../../../../locales/i18n';
import { ConfirmationLoaderSelectorIDs } from '../../ConfirmationView.testIds';

/** A minimal ETH asset with 2 ETH balance, suitable for EVM send tests. */
const EVM_ETH_ASSET = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1',
  symbol: 'ETH',
  decimals: 18,
  balance: '2',
  rawBalance: '0x1BC16D674EC80000', // 2 ETH
};

/**
 * Native ETH with high balance so keypad "5" is within available funds (smoke
 * `send-native-token` uses ~10 ETH from balances API).
 */
const EVM_NATIVE_ETH_ASSET_SEND_FIVE = {
  ...EVM_ETH_ASSET,
  balance: '10',
  rawBalance: '0x8AC7230489E80000', // 10 ETH
};

const VALID_EVM_RECIPIENT = '0x0000000000000000000000000000000000000002';
const TOKEN_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000003';

/** Mainnet USDC (6 decimals), high balance — mirrors smoke ERC-20 send E2E fixture. */
const EVM_USDC_ASSET = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  symbol: 'USDC',
  decimals: 6,
  balance: '10000',
  rawBalance: '0x2540BE400', // 10_000 * 10^6
  standard: TokenStandard.ERC20,
};

function SendFlowWithHardwareWalletProvider() {
  return (
    <HardwareWalletProvider>
      <Send />
    </HardwareWalletProvider>
  );
}

describeForPlatforms('Send', () => {
  describe('ERC-721', () => {
    /**
     * Regression test for issue #12317
     * When sending an ERC-721 token, the Next/Continue button must be enabled so the user
     * can proceed from Amount to Recipient (and not get stuck with "Fiat conversions not available").
     */
    it('Amount screen shows enabled Continue button and user can proceed to Recipient', async () => {
      const erc721Asset = {
        address: '0x4B3E2eD66631FE2dE488CB0c23eF3A91A41601f7',
        chainId: '0x1',
        symbol: 'NFT',
        name: 'Test NFT',
        standard: TokenStandard.ERC721,
        tokenId: '42',
        balance: '1',
      };

      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const { getByTestId, getByRole, getByText, findByTestId } =
        renderScreenWithRoutes(
          Send as unknown as React.ComponentType,
          { name: Routes.SEND.DEFAULT },
          [],
          { state },
          { screen: Routes.SEND.AMOUNT, params: { asset: erc721Asset } },
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
    it('Asset screen navigates to Recipient not Amount', async () => {
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
        getNftRowTestId('Test ERC721 NFT', '42'),
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
  });

  describe('EVM', () => {
    beforeEach(() => {
      // Reset AssetsContractController mock so each test starts clean.
      // The Engine mock in mocks.ts registers this as jest.fn().mockResolvedValue({}).
      // Resetting here ensures any one-time override from a previous test is cleared.
      const engineMock = jest.requireMock(
        '../../../../../../app/core/Engine',
      ) as unknown as {
        default: {
          context: {
            AssetsContractController: { getTokenStandardAndDetails: jest.Mock };
          };
        };
      };
      engineMock.default.context.AssetsContractController.getTokenStandardAndDetails.mockResolvedValue(
        {},
      );
    });

    /**
     * Core EVM native ETH path: Amount (100%) → Continue → Recipient → Review.
     * Uses the same `Amount` / `useAmountValidation` stack as ERC-20; native vs
     * token is determined by asset (zero address vs contract).
     */
    it('ETH: Amount → Continue → Recipient, valid address enables Review', async () => {
      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const { getByTestId, getByRole, findByTestId } = renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [],
        { state },
        { screen: Routes.SEND.AMOUNT, params: { asset: EVM_ETH_ASSET } },
      );

      expect(
        getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
      ).toBeOnTheScreen();

      fireEvent.press(
        getByTestId(RedesignedSendViewSelectorsIDs.PERCENTAGE_BUTTON_100),
      );
      fireEvent.press(getByRole('button', { name: 'Continue' }));

      const addressInput = await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
        {},
        { timeout: 5000 },
      );
      fireEvent.changeText(addressInput, VALID_EVM_RECIPIENT);

      const reviewButton = await findByTestId(
        RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
        {},
        { timeout: 5000 },
      );
      await waitFor(() => expect(reviewButton).toBeEnabled(), {
        timeout: 5000,
      });
    });

    /**
     * Native ETH keyed amount mirrors the smoke `send-native-token` happy path:
     * 5 ETH -> Continue -> Recipient -> Review -> transfer confirmation route.
     */
    it('Native ETH: digit 5 submits and opens transfer confirmation route', async () => {
      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const engineMock = jest.requireMock(
        '../../../../../../app/core/Engine',
      ) as unknown as {
        default: {
          context: {
            TransactionController: { addTransaction: jest.Mock };
          };
        };
      };
      const addTransactionSpy =
        engineMock.default.context.TransactionController.addTransaction;
      addTransactionSpy.mockClear();

      const { getByTestId, getByText, getByRole, findByTestId } =
        renderScreenWithRoutes(
          SendFlowWithHardwareWalletProvider as unknown as React.ComponentType,
          { name: Routes.SEND.DEFAULT },
          [],
          { state },
          {
            screen: Routes.SEND.AMOUNT,
            params: { asset: EVM_NATIVE_ETH_ASSET_SEND_FIVE },
          },
        );

      expect(
        getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
      ).toBeOnTheScreen();

      fireEvent.press(getByText('5'));
      fireEvent.press(getByRole('button', { name: 'Continue' }));

      const recipientInput = await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
        {},
        { timeout: 5000 },
      );
      fireEvent.changeText(recipientInput, VALID_EVM_RECIPIENT);

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
        expect(addTransactionSpy).toHaveBeenCalledTimes(1);
      });

      expect(
        await findByTestId(ConfirmationLoaderSelectorIDs.TRANSFER),
      ).toBeOnTheScreen();
    });

    /**
     * Covers smoke `send-erc20-token`: 50% of balance through Recipient / Review
     * into the transfer confirmation route.
     */
    it('ERC-20 USDC: 50% submits and opens transfer confirmation route', async () => {
      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const engineMock = jest.requireMock(
        '../../../../../../app/core/Engine',
      ) as unknown as {
        default: {
          context: {
            TransactionController: { addTransaction: jest.Mock };
          };
        };
      };
      const addTransactionSpy =
        engineMock.default.context.TransactionController.addTransaction;
      addTransactionSpy.mockClear();

      const { getByTestId, getByRole, findByTestId } = renderScreenWithRoutes(
        SendFlowWithHardwareWalletProvider as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [],
        { state },
        { screen: Routes.SEND.AMOUNT, params: { asset: EVM_USDC_ASSET } },
      );

      expect(
        getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
      ).toBeOnTheScreen();

      fireEvent.press(
        getByTestId(RedesignedSendViewSelectorsIDs.PERCENTAGE_BUTTON_50),
      );
      fireEvent.press(getByRole('button', { name: 'Continue' }));

      const recipientInput = await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
        {},
        { timeout: 5000 },
      );
      fireEvent.changeText(recipientInput, VALID_EVM_RECIPIENT);

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
        expect(addTransactionSpy).toHaveBeenCalledTimes(1);
      });

      expect(
        await findByTestId(ConfirmationLoaderSelectorIDs.TRANSFER),
      ).toBeOnTheScreen();
    });

    /**
     * Send Max ETH → Continue → Recipient
     */
    it('Send Max → Continue → Recipient screen', async () => {
      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const { getByTestId, getByRole, findByTestId } = renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [],
        { state },
        {
          screen: Routes.SEND.AMOUNT,
          params: { asset: EVM_NATIVE_ETH_ASSET_SEND_FIVE },
        },
      );

      expect(
        getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
      ).toBeOnTheScreen();

      fireEvent.press(getByRole('button', { name: 'Max' }));
      fireEvent.press(getByRole('button', { name: 'Continue' }));

      expect(
        await findByTestId(
          RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
          {},
          { timeout: 5000 },
        ),
      ).toBeOnTheScreen();
    });

    /**
     * Typing an invalid address (not a valid hex, ENS, or non-EVM address)
     * must disable the Review button and show an error label.
     */
    it('Recipient: invalid address disables Review with error text', async () => {
      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const { findByTestId } = renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [],
        { state },
        { screen: Routes.SEND.RECIPIENT, params: { asset: EVM_ETH_ASSET } },
      );

      const addressInput = await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
        {},
        { timeout: 5000 },
      );
      fireEvent.changeText(addressInput, 'notanaddress');

      const reviewButton = await findByTestId(
        RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
        {},
        { timeout: 5000 },
      );
      await waitFor(() => expect(reviewButton).toBeDisabled(), {
        timeout: 5000,
      });
      expect(
        await screen.findByRole(
          'button',
          { name: strings('send.invalid_address') },
          { timeout: 5000 },
        ),
      ).toBeOnTheScreen();
    });

    /**
     * When the recipient is a token contract address, sending would burn the tokens.
     * The Recipient screen must show a warning modal before proceeding.
     * Cancelling the modal must close it and keep the user on the Recipient screen.
     */
    it('Recipient: token contract address opens alert modal; cancel closes it', async () => {
      const engineMock = jest.requireMock(
        '../../../../../../app/core/Engine',
      ) as unknown as {
        default: {
          context: {
            AssetsContractController: { getTokenStandardAndDetails: jest.Mock };
          };
        };
      };
      engineMock.default.context.AssetsContractController.getTokenStandardAndDetails.mockImplementation(
        (tokenAddress: string) => {
          if (
            tokenAddress?.toLowerCase() === TOKEN_CONTRACT_ADDRESS.toLowerCase()
          ) {
            return Promise.resolve({
              standard: 'ERC20',
              symbol: 'TOKEN',
              decimals: '18',
            });
          }
          return Promise.resolve({});
        },
      );

      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const { findByTestId, queryByTestId } = renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [],
        { state },
        { screen: Routes.SEND.RECIPIENT, params: { asset: EVM_ETH_ASSET } },
      );

      const addressInput = await findByTestId(
        RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
        {},
        { timeout: 5000 },
      );
      fireEvent.changeText(addressInput, TOKEN_CONTRACT_ADDRESS);

      const reviewButton = await findByTestId(
        RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
        {},
        { timeout: 5000 },
      );
      await waitFor(() => expect(reviewButton).toBeEnabled(), {
        timeout: 5000,
      });
      fireEvent.press(reviewButton);

      expect(
        await findByTestId(
          SendAlertModalSelectorIDs.CANCEL_BUTTON,
          {},
          { timeout: 5000 },
        ),
      ).toBeOnTheScreen();

      fireEvent.press(
        screen.getByTestId(SendAlertModalSelectorIDs.CANCEL_BUTTON),
      );

      await waitFor(
        () =>
          expect(
            queryByTestId(SendAlertModalSelectorIDs.CANCEL_BUTTON),
          ).not.toBeOnTheScreen(),
        { timeout: 5000 },
      );
    });

    /**
     * When the entered amount exceeds the asset balance, the Continue button
     * must show the "Insufficient funds" error and be disabled.
     */
    it('Amount: exceeding balance disables Continue with Insufficient funds', async () => {
      const tinyBalanceAsset = {
        ...EVM_ETH_ASSET,
        balance: '0',
        rawBalance: '0x1', // 1 wei — any 1 ETH input exceeds it
      };

      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const { getByTestId, getByText, findByRole } = renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [],
        { state },
        { screen: Routes.SEND.AMOUNT, params: { asset: tinyBalanceAsset } },
      );

      expect(
        getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
      ).toBeOnTheScreen();

      // Press digit '1' — enters 1 ETH, far exceeding 1 wei balance
      fireEvent.press(getByText('1'));

      // Finding the button by its error label is sufficient — it proves the error state is shown
      expect(
        await findByRole(
          'button',
          { name: 'Insufficient funds' },
          { timeout: 5000 },
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('ERC-1155', () => {
    /**
     * ERC-1155 tokens show the NFT name on the Amount screen and use a "Next"
     * label instead of "Continue". The button is disabled until a quantity is entered,
     * then enabled when the entered quantity does not exceed the owned balance.
     */
    it('Amount screen shows NFT name and Next button enabled after entering quantity', async () => {
      const erc1155Asset = {
        address: '0x495f947276749ce646f68ac8c248420045cb7b5e',
        chainId: '0x1',
        symbol: 'ITEM',
        name: 'Magic Sword',
        standard: TokenStandard.ERC1155,
        tokenId: '99',
        balance: '5',
      };

      const state = initialStateWallet()
        .withOverrides(sendViewOverrides)
        .build();

      const { getByTestId, getByRole, getByText } = renderScreenWithRoutes(
        Send as unknown as React.ComponentType,
        { name: Routes.SEND.DEFAULT },
        [],
        { state },
        { screen: Routes.SEND.AMOUNT, params: { asset: erc1155Asset } },
      );

      expect(
        getByTestId(RedesignedSendViewSelectorsIDs.SEND_AMOUNT),
      ).toBeOnTheScreen();

      // NFT name is shown in the amount header
      expect(getByText('Magic Sword')).toBeOnTheScreen();

      // "Next" button is visible immediately (ERC-1155 always shows it)
      expect(getByRole('button', { name: 'Next' })).toBeOnTheScreen();

      // Enter quantity 3 (≤ balance of 5) → button becomes enabled
      fireEvent.press(getByText('3'));

      await waitFor(
        () => expect(getByRole('button', { name: 'Next' })).toBeEnabled(),
        { timeout: 5000 },
      );
    });
  });

  describe('Recipient list', () => {
    /**
     * Regression test for issue #22806
     * Recipient list (accounts or contacts) must render each entry with the expected avatar.
     * Uses address-book contacts to avoid dependency on multichain account tree/feature flags.
     */
    it('renders each contact with avatar', async () => {
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
          screen: Routes.SEND.AMOUNT,
          params: {
            asset: {
              chainId: '0x1',
              symbol: 'ETH',
              decimals: 18,
              balance: '1',
            },
          },
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

      const avatarElements: ReturnType<typeof getByTestId>[] = [];
      for (const address of contactAddresses) {
        const recipientRow = await waitFor(
          () => screen.getByTestId(getRecipientRowTestId(address)),
          { timeout: 5000 },
        );
        expect(recipientRow).toBeOnTheScreen();
        const avatar = getByTestId(getRecipientAvatarTestId(address));
        expect(avatar).toBeOnTheScreen();
        avatarElements.push(avatar);
      }

      // Regression guard for #22806: all contacts rendered the same avatar.
      // Extract the accountAddress fed to each Avatar and verify all are unique.
      const avatarAddresses = avatarElements.map((el) => {
        const nodes = el.findAll((node) => 'accountAddress' in node.props);
        return nodes[0]?.props.accountAddress;
      });
      for (const addr of avatarAddresses) {
        expect(addr).toBeDefined();
      }
      const uniqueAddresses = new Set(avatarAddresses);
      expect(uniqueAddresses.size).toBe(avatarAddresses.length);
    });
  });
});
