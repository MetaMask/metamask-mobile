'use strict';
import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';
import WalletView from '../../pages/wallet/WalletView';

const fixtureServer = new FixtureServer();

describe(Regression('Carousel Tests'), () => {
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
    const carouselContainer = await WalletView.carouselContainer;
    await Assertions.checkIfVisible(carouselContainer, 5000);
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
      title: 'MetaMask Card',
      id: 'card'
    },
    {
      title: 'Fund your wallet',
      id: 'fund',
    },
  ];

  it('should display carousel with correct slides', async () => {
    const carouselFirstSlide = await WalletView.getCarouselSlide(SLIDES[0].id);
    const carouselFirstSlideTitle = await WalletView.getCarouselSlideTitle(SLIDES[0].id);
    const carouselProgressDots = await WalletView.carouselProgressDots;
    await Assertions.checkIfVisible(carouselFirstSlide, 5000);
    await Assertions.checkIfElementToHaveText(
      carouselFirstSlideTitle,
      SLIDES[0].title,
      5000,
    );
    await Assertions.checkIfVisible(carouselProgressDots, 5000);
  });

  it('should navigate between slides', async () => {
    const carouselSecondSlide = await WalletView.getCarouselSlide(SLIDES[1].id);
    const carouselSecondSlideTitle = await WalletView.getCarouselSlideTitle(SLIDES[1].id);
    const carouselFirstSlideTitle = await WalletView.getCarouselSlideTitle(SLIDES[0].id);
    await WalletView.swipeCarousel('left');
    await Assertions.checkIfVisible(carouselSecondSlide, 5000);
    await Assertions.checkIfElementToHaveText(
      carouselSecondSlideTitle,
      SLIDES[1].title,
      5000,
    );
    await WalletView.swipeCarousel('right');
    await Assertions.checkIfElementToHaveText(
      carouselFirstSlideTitle,
      SLIDES[0].title,
      5000,
    );
  });

  it('should dismiss a slide', async () => {
    await device.disableSynchronization();
    const carouselSecondSlideTitle = await WalletView.getCarouselSlideTitle(SLIDES[1].id);
    const firstSlideCloseButton =
      await WalletView.getCarouselSlideCloseButton(SLIDES[0].id);
    await Assertions.checkIfVisible(firstSlideCloseButton, 5000);
    await WalletView.closeCarouselSlide(SLIDES[0].id);
    await TestHelpers.delay(5000);
    await Assertions.checkIfElementToHaveText(
      carouselSecondSlideTitle,
      SLIDES[1].title,
      5000,
    );
    await device.enableSynchronization();
  });

  it('should handle slide interactions', async () => {
    await device.disableSynchronization();
    // First slide was already dismissed in the previous test
    // Dismissing the second slide as it's opening portfolio
    await WalletView.closeCarouselSlide(SLIDES[1].id);
    const thirdCarouselSlideTitle = await WalletView.getCarouselSlideTitle(SLIDES[2].id);
    const container = await WalletView.container;
    await Assertions.checkIfElementToHaveText(
      thirdCarouselSlideTitle,
      SLIDES[2].title,
      5000,
    );
    await WalletView.tapCarouselSlide(SLIDES[2].id);
    await Assertions.checkIfVisible(container, 5000);
    await TestHelpers.delay(5000);
    await device.enableSynchronization();
  });
});
