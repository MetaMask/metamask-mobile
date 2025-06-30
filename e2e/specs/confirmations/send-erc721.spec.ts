'use strict';

import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../fixtures/utils';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import { CustomNetworks } from '../../resources/networks.e2e';
const MONAD_TESTNET = CustomNetworks.MonadTestnet.providerConfig;
const MEGAETH_TESTNET = CustomNetworks.MegaTestnet.providerConfig;

describe(SmokeConfirmations('ERC721 tokens'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('send an ERC721 token from a dapp', async () => {
    const testSpecificMock  = {
      GET: [
        mockEvents.GET.suggestedGasFeesApiGanache
      ],
    };

    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: NFT_CONTRACT,
        testSpecificMock,
      },
      // Remove any once withFixtures is typed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async ({ contractRegistry }: { contractRegistry: any }) => {
        const nftsAddress = await contractRegistry.getContractAddress(
          NFT_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });
        // Transfer NFT

        await TestDApp.tapNFTTransferButton();
        await TestHelpers.delay(3000);

        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert collectible is sent
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SENT_COLLECTIBLE_MESSAGE_TEXT,
        );
      },
    );
  });

it(`send an ERC721 token from a dapp using ${MEGAETH_TESTNET.nickname} (local)`, async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.suggestedGasFeesApiGanache
      ],
    };

    // Create MegaETH-like Ganache configuration
    const megaEthLocalConfig = {
      ...defaultGanacheOptions,
      chainId: parseInt(MEGAETH_TESTNET.chainId, 16), // Use Mega ETH chain ID
      networkId: parseInt(MEGAETH_TESTNET.chainId, 16),
      // Keep other Mega ETH characteristics
      gasPrice: '0x3b9aca00',
      gasLimit: '0x1c9c380',
    };

    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(buildPermissions([`${megaEthLocalConfig.chainId}`]))
          .build(),
        restartDevice: true,
        smartContract: NFT_CONTRACT,
        ganacheOptions: megaEthLocalConfig,
        testSpecificMock,
      },
      // Remove any once withFixtures is typed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async ({ contractRegistry }: { contractRegistry: any }) => {
        const nftsAddress = await contractRegistry.getContractAddress(
          NFT_CONTRACT,
        );

        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });

        // Transfer NFT
        await TestDApp.tapNFTTransferButton();
        await TestHelpers.delay(3000);

        // Accept confirmation
        await FooterActions.tapConfirmButton();
        await TestHelpers.delay(3000);

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Confirmed');
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SENT_COLLECTIBLE_MESSAGE_TEXT,
        );
      },
    );
  });

it(`send an ERC721 token from a dapp using ${MONAD_TESTNET.nickname} (local)`, async () => {
    const testSpecificMock = {
      GET: [
        mockEvents.GET.suggestedGasFeesApiGanache
      ],
    };

    // Create Monad-like Ganache configuration
    const monadLocalConfig = {
      ...defaultGanacheOptions,
      chainId: parseInt(MONAD_TESTNET.chainId, 16),
      networkId: parseInt(MONAD_TESTNET.chainId, 16),
      gasPrice: '0x1',
      gasLimit: '0x5f5e100',
    };

    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork() // Use standard Ganache network setup
          .withPermissionControllerConnectedToTestDapp(buildPermissions([`${monadLocalConfig.chainId}`]))
          .build(),
        restartDevice: true,
        smartContract: NFT_CONTRACT,
        ganacheOptions: monadLocalConfig, // Apply Monad characteristics
        testSpecificMock,
      },
      // Remove any once withFixtures is typed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async ({ contractRegistry }: { contractRegistry: any }) => {
        const nftsAddress = await contractRegistry.getContractAddress(
          NFT_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });
        // Transfer NFT
        await TestDApp.tapNFTTransferButton();
        await TestHelpers.delay(3000);

        // Accept confirmation
        await FooterActions.tapConfirmButton();
        await TestHelpers.delay(3000);

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Confirmed');
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SENT_COLLECTIBLE_MESSAGE_TEXT,
        );
      },
    );
  });

});
