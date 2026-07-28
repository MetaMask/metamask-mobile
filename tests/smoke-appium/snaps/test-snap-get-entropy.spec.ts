import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Get Entropy Snap Tests'), () => {
  appiumTest(
    'connects to the Get Entropy Snap and signs messages with Snap entropy',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
        },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectGetEntropyButton');

          await TestSnaps.fillMessage('entropyMessageInput', '1234');
          await TestSnaps.tapButton('signEntropyMessageButton');
          await Assertions.expectTextDisplayed('Signature request', {
            description: 'Snap signature request should be visible',
          });
          await TestSnaps.approveSignRequest();
          await TestSnaps.checkResultSpan(
            'entropySignResultSpan',
            '"0x9341785782b512c86235612365f1076b16731ed9473beb4d0804c30b7fcc3a055aa7103b02dc64014d923220712dfbef023ddcf6327b313ea2dfd4d83dc5a53e1c5e7f4e10bce49830eded302294054df8a7a46e5b6cb3e50eec564ecba17941"',
          );

          const entropySources: [string, string][] = [
            [
              'SRP 1 (primary)',
              '0xadd276f9d715223dcd20a595acb475f9b7353c451a57af64efb23633280c21aa172bd6689c27a0ac3c003ec4469b093207db956a6bf76689b3cc0b710c4187d5fcdca5f09c9594f146c9a39461e2f6cb03a446f4e62bd341a448ca9a33e96cf2',
            ],
            [
              'SRP 2',
              '0xa1dba3ddefabb56c5d6d37135fd07752662b5d720c005d619c0ff49eede2fe6f92a3e88e70ff4bb706b9ec2a076925ec159e3f6aa7170d51e428ccafe2353dd858da425c075912f0cd78c750942afef230393dff20d9fb58de14c56a5cd213b1',
            ],
          ];

          for (const [entropySource, result] of entropySources) {
            await TestSnaps.selectInDropdown(
              'getEntropyDropDown',
              entropySource,
            );
            await TestSnaps.fillMessage('entropyMessageInput', '5678');
            await TestSnaps.tapButton('signEntropyMessageButton');
            await Assertions.expectTextDisplayed('Signature request', {
              description: 'Snap signature request should be visible',
            });
            await TestSnaps.approveSignRequest();
            await TestSnaps.checkResultSpan(
              'entropySignResultSpan',
              `"${result}"`,
            );
          }

          await TestSnaps.selectInDropdown('getEntropyDropDown', 'Invalid');
          await TestSnaps.fillMessage('entropyMessageInput', 'foo bar');
          await TestSnaps.tapButton('signEntropyMessageButton');
          await TestSnaps.approveSignRequest();
          await Assertions.expectTextDisplayed(
            'Entropy source with ID "invalid" not found.',
            { timeout: 30_000 },
          );
          await TestSnaps.dismissAlert();
        },
      );
    },
  );
});
