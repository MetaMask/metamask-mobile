import { SmokeAssets } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import SortModal from '../../../pages/wallet/TokenSortBottomSheet';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
} from '../../../fixtures/fixture-helper';
import FixtureServer from '../../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../../fixtures/utils';
import { loginToApp } from '../../../viewHelper';
import Assertions from '../../../utils/Assertions';
import ConfirmAddAssetView from '../../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import TestHelpers from '../../../helpers';

import Tenderly from '../../../tenderly';
import { CustomNetworks } from '../../../resources/networks.e2e';
import ImportTokensView from '../../../pages/wallet/ImportTokenFlow/ImportTokensView';

const fixtureServer = new FixtureServer();

describe(SmokeAssets('Import Tokens'), () => {
  beforeAll(async () => {
    await Tenderly.addFunds(
      CustomNetworks.Tenderly.Mainnet.providerConfig.rpcUrl,
      DEFAULT_FIXTURE_ACCOUNT,
    );

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly.Mainnet)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  it('should add a aave token', async () => {
    await WalletView.tapImportTokensButton();
    await ImportTokensView.searchToken('AAVE');
    await ImportTokensView.tapOnToken(); // taps the first token in the returned list
    await ImportTokensView.tapOnNextButton();

    await TestHelpers.delay(500);
    await Assertions.checkIfVisible(ConfirmAddAssetView.container);

    await ConfirmAddAssetView.tapOnConfirmButton();

    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should sort tokens alphabetically', async () => {
    await WalletView.tapSortBy();
    await SortModal.tapSortAlphabetically();

    const tokens = await WalletView.getTokensInWallet();
    const tokensAttributes = await tokens.getAttributes();
    const label = tokensAttributes.label;

    // Ensure `label` contains "Aave" followed (somewhere) by "Ethereum".
    const textOrderRegex = new RegExp('Aave([\\s\\S]*?)Ethereum', 'i');
    const isMatch = label.match(textOrderRegex);
    if (!isMatch) {
      throw new Error('Expected label to match the regex, but it did not.');
    }
  });

  it('should sort tokens by fiat amount', async () => {
    await WalletView.tapSortBy();
    await SortModal.tapSortFiatAmount();

    const tokens = await WalletView.getTokensInWallet();
    const tokensAttributes = await tokens.getAttributes();
    const label = tokensAttributes.label;

    // Ensure `label` contains "Ethereum" followed (somewhere) by "Aave".
    const textOrderRegex = new RegExp('Ethereum([\\s\\S]*?)Aave', 'i');
    const isMatch = label.match(textOrderRegex);
    if (!isMatch) {
      throw new Error('Expected label to match the regex, but it did not.');
    }
  });
});
