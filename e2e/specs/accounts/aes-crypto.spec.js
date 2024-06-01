import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';

describe(Regression('AES Crypto'), () => {
  // const PASSWORD = '123123123';

  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('executes all aes crypto methods successfully', async () => {
    const fixture = new FixtureBuilder().build();
    await withFixtures({ fixture, restartDevice: true }, async () => {
      // should go to settings then security & privacy
      await TabBarComponent.tapSettings();
    });
  });
});
