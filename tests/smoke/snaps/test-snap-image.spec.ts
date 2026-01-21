import { FlaskBuildTests } from '../../tags';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import { Assertions, Matchers } from '../../framework';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Image Snap Tests'), () => {
  it('can connect to the Image Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectImageButton');
      },
    );
  });

  it('can display SVGs', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
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
        skipReactNativeReload: true,
      },
      async () => {
        await TestSnaps.tapButton('showPNGImage');

        const dynamicPng = Matchers.getElementByID('snaps-ui-image');
        await Assertions.expectElementToBeVisible(dynamicPng);
      },
    );
  });
});
