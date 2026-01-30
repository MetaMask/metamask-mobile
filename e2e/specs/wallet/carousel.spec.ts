import { RegressionWalletUX } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { Assertions } from '../../../tests/framework';
import WalletView from '../../pages/wallet/WalletView';
import { Mockttp } from 'mockttp';
import { setupContentfulPromotionalBannersMock } from '../../../tests/api-mocking/helpers/contentfulHelper';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';

describe(RegressionWalletUX('Carousel Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(mockServer, {
      carouselBanners: true,
      contentfulCarouselEnabled: true,
    });
    await setupContentfulPromotionalBannersMock(mockServer);
  };

  it.skip('displays carousel with slides from Contentful', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withCleanBannerState().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(
          WalletView.carouselContainer,
          { description: 'carousel container should be visible' },
        );

        await Assertions.expectElementToBeVisible(
          WalletView.carouselProgressDots,
          { description: 'carousel progress dots should be visible' },
        );
      },
    );
  });

  it('navigates between slides using swipe gestures', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withCleanBannerState().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(
          WalletView.carouselContainer,
          { description: 'carousel container should be visible' },
        );

        // Test swipe navigation
        await WalletView.swipeCarousel('left');
        await WalletView.swipeCarousel('right');

        await Assertions.expectElementToBeVisible(
          WalletView.carouselContainer,
          { description: 'carousel should remain visible after swiping' },
        );
      },
    );
  });

  it('can dismiss slides', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withCleanBannerState().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(
          WalletView.carouselContainer,
          { description: 'carousel container should be visible' },
        );

        await device.disableSynchronization();

        // Find and dismiss any available slide
        const firstSlide = await WalletView.carouselContainer;
        await firstSlide.tap();

        await Assertions.expectElementToBeVisible(
          WalletView.carouselContainer,
          {
            description:
              'carousel should remain visible after slide interaction',
          },
        );

        await device.enableSynchronization();
      },
    );
  });
});
