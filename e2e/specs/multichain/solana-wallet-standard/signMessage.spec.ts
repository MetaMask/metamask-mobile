'use strict';
import { SmokeNetworkExpansion } from '../../../tags';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
  DEFAULT_SOLANA_TEST_DAPP_PATH,
  withFixtures,
} from '../../../fixtures/fixture-helper';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, setup } from './testHelpers';
import Gestures from '../../../utils/Gestures';
import Matchers from '../../../utils/Matchers';
import Assertions from '../../../utils/Assertions';

describe(
  SmokeNetworkExpansion('Solana Wallet Standard E2E - Sign Message'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    describe('Sign Message', () => {
      it('Should sign a message', async () => {
        await withFixtures(
          {
            ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
            fixture: new FixtureBuilder()
              .withSolanaFixture()
              .withSolanaFeatureSheetDisplayed()
              .build(),
            dappPath: DEFAULT_SOLANA_TEST_DAPP_PATH,
            restartDevice: true,
          },
          async () => {
            await setup();

            await connectSolanaTestDapp();

            const signMessageTest = SolanaTestDApp.getSignMessageTest();
            // await signMessageTest.setMessage('Hello, world!');
            await signMessageTest.signMessage();

            // Confirm the signature
            const confirmButton = Matchers.getElementByText('Confirm');
            await Gestures.waitAndTap(confirmButton);

            const signedMessage = await signMessageTest.getSignedMessage();
            await Assertions.checkIfTextMatches(
              signedMessage,
              'Kort1JYMAf3dmzKRx4WiYXW9gSfPHzxw0flAka25ymjB4d+UZpU/trFoSPk4DM7emT1c/e6Wk0bsRcLsj/h9BQ==',
            );
          },
        );
      });
    });
  },
);
