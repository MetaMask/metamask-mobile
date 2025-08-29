import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';
import { Assertions, Matchers } from '../../framework';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Image Snap Tests'), () => {
  it('can connect to the Image Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectImageButton');
      },
    );
  });

  it('can display SVGs', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await TestSnaps.tapButton('showSVGImage');

        const dynamicSvg = Matchers.getElementByID('snaps-ui-image');
        await Assertions.expectElementToBeVisible(dynamicSvg);

        await TestSnaps.tapOkButton();
      },
    );
  });

  it('can display PNGs', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await TestSnaps.tapButton('showPNGImage');

        const dynamicPng = Matchers.getElementByID('snaps-ui-image');
        await Assertions.expectElementToBeVisible(dynamicPng);
      },
    );
  });
});
