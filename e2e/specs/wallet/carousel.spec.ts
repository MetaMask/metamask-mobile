import { RegressionWalletUX } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';

const fixtureServer = new FixtureServer();

describe(RegressionWalletUX('Carousel Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });
  beforeEach(async () => {
    jest.setTimeout(150000);
    await Assertions.expectElementToBeVisible(WalletView.carouselContainer);
  });
  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  const SLIDES = [
    {
      title: 'Solana is now supported',
      id: 'solana',
    },
    {
      title: 'Start using smart accounts',
      id: 'smartAccount',
    },
    {
      title: 'MetaMask Card',
      id: 'card',
    },
    {
      title: 'Fund your wallet',
      id: 'fund',
    },
  ];

  it('should display carousel with correct slides', async () => {
    await Assertions.expectElementToBeVisible(
      WalletView.getCarouselSlide(SLIDES[0].id),
    );
    await Assertions.expectElementToHaveText(
      WalletView.getCarouselSlideTitle(SLIDES[0].id),
      SLIDES[0].title,
    );
    await Assertions.expectElementToBeVisible(WalletView.carouselProgressDots);
  });

  it('should navigate between slides', async () => {
    await WalletView.swipeCarousel('left');
    await Assertions.expectElementToBeVisible(
      WalletView.getCarouselSlide(SLIDES[1].id),
    );
    await Assertions.expectElementToHaveText(
      WalletView.getCarouselSlideTitle(SLIDES[1].id),
      SLIDES[1].title,
    );
    await WalletView.swipeCarousel('right');
    await Assertions.expectElementToHaveText(
      WalletView.getCarouselSlideTitle(SLIDES[0].id),
      SLIDES[0].title,
    );
  });

  it('should dismiss a slide', async () => {
    await device.disableSynchronization();
    await Assertions.expectElementToBeVisible(
      WalletView.getCarouselSlideCloseButton(SLIDES[0].id),
    );
    await WalletView.closeCarouselSlide(SLIDES[0].id);
    await Assertions.expectElementToHaveText(
      WalletView.getCarouselSlideTitle(SLIDES[1].id),
      SLIDES[1].title,
    );
  });

  it('should handle slide interactions', async () => {
    // First slide was already dismissed in the previous test
    // Dismissing the second slide as it's opening portfolio
    console.log('here');
    await WalletView.closeCarouselSlide(SLIDES[1].id);

    await Assertions.expectElementToHaveText(
      WalletView.getCarouselSlideTitle(SLIDES[2].id),
      SLIDES[2].title,
    );
    await WalletView.tapCarouselSlide(SLIDES[2].id);
    await Assertions.expectElementToBeVisible(WalletView.container);
    await device.enableSynchronization();
  });
});
