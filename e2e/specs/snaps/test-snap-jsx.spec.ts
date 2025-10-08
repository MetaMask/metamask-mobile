import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';
import { Assertions, Gestures, Matchers } from '../../framework';

jest.setTimeout(150_000);

describe(FlaskBuildTests('JSX Snap Tests'), () => {
  it('can connect to the JSX Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectJsx');
      },
    );
  });

  it('displays a modifiable JSX interface', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
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
