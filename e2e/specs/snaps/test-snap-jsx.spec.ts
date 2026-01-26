import { FlaskBuildTests } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import TestSnaps from '../../pages/Browser/TestSnaps';
import { Assertions, Gestures, Matchers } from '../../../tests/framework';

jest.setTimeout(150_000);

describe(FlaskBuildTests('JSX Snap Tests'), () => {
  it('can connect to the JSX Snap', async () => {
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

        await TestSnaps.installSnap('connectJsx');
      },
    );
  });

  it('displays a modifiable JSX interface', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        await TestSnaps.tapButton('displayJsxButton');

        await Assertions.expectTextDisplayed('0');

        const dynamicButton = Matchers.getElementByText('Increment');
        await Gestures.tap(dynamicButton);

        await Assertions.expectTextDisplayed('1');
      },
    );
  });
});
