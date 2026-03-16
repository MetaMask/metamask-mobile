import { RegressionWalletPlatform } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../page-objects/wallet/WalletView';
import RedesignedSendView from '../../page-objects/Send/RedesignedSendView';
import { loginToApp } from '../../flows/wallet.flow';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import ImportTokensView from '../../page-objects/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  confirmationFeatureFlags,
  remoteFeatureFlagHomepageSectionsV1Enabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { Mockttp } from 'mockttp';
import { LocalNode } from '../../framework/types';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';

const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(RegressionWalletPlatform('Send ERC Token'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should send erc token successfully', async () => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              chainId: '0x539',
              rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
              type: 'custom',
              nickname: 'Local RPC',
              ticker: 'ETH',
            })
            .withNetworkEnabledMap({
              eip155: { '0x539': true },
            })
            .build();
        },
        restartDevice: true,
        smartContracts: [SMART_CONTRACTS.HST],
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureFlagHomepageSectionsV1Enabled(),
            ...Object.assign({}, ...confirmationFeatureFlags),
          });
        },
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry?.getContractAddress(
          SMART_CONTRACTS.HST,
        );

        await loginToApp();
        await WalletView.tapOnNewTokensSection();
        await WalletView.tapTokenNetworkFilter();
        await NetworkListModal.tapOnCustomTab();
        await NetworkListModal.changeNetworkTo('Local RPC');
        await WalletView.tapImportTokensButton(); // Disable sync to prevent test hang
        await ImportTokensView.typeTokenAddress(hstAddress);
        await Assertions.expectElementToHaveText(
          ImportTokensView.symbolInput,
          'TST',
          {
            timeout: 5000,
            description: 'Symbol field should auto-populate with TST',
          },
        );

        await ImportTokensView.tapOnNextButton('Search Token');
        // Tap confirm by id to avoid relying on shared page object
        await Gestures.waitAndTap(Matchers.getElementByText('Import'), {
          elemDescription: 'Confirm Add Asset Button',
          timeout: 15000,
        });
        await WalletView.tapOnNewTokensSection();
        await WalletView.tapOnToken('TST');
        await TokenOverview.tapSendButton();
        await RedesignedSendView.pressAmountFiveButton();
        await RedesignedSendView.pressContinueButton();
        await RedesignedSendView.inputRecipientAddress(SEND_ADDRESS);
        await RedesignedSendView.pressReviewButton();
        await FooterActions.tapConfirmButton();
        await Assertions.expectTextDisplayed('Confirmed', {
          timeout: 30000,
          description: 'Transaction status should display Confirmed',
        });
      },
    );
  });
});
