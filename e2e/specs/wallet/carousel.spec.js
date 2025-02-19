'use strict';
import { SmokeCore } from '../../tags';
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
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

const fixtureServer = new FixtureServer();

describe(SmokeCore('Carousel Tests'), () => {
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
    // Wait for the Carousel to be rendered
    const carouselContainer = await WalletView.carouselContainer;
    await Assertions.checkIfVisible(carouselContainer, 30000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should display carousel with correct slides', async () => {
    const carouselContainer = await WalletView.carouselContainer;
    const carouselFirstSlide = await WalletView.carouselFirstSlide;
    const carouselFirstSlideTitle = await WalletView.carouselFirstSlideTitle;
    const carouselProgressDots = await WalletView.carouselProgressDots;

    await Assertions.checkIfVisible(carouselContainer);
    await Assertions.checkIfVisible(carouselFirstSlide);
    await Assertions.checkIfElementToHaveText(
      carouselFirstSlideTitle,
      'Bridge tokens',
    );
    await Assertions.checkIfVisible(carouselProgressDots);
  });

  it('should navigate between slides', async () => {
    const carouselContainer = await WalletView.carouselContainer;
    const carouselSecondSlide = await WalletView.carouselSecondSlide;
    const carouselSecondSlideTitle = await WalletView.carouselSecondSlideTitle;
    const carouselFirstSlideTitle = await WalletView.carouselFirstSlideTitle;

    await Gestures.swipe(carouselContainer, 'left', 'slow', 0.7);
    await Assertions.checkIfVisible(carouselSecondSlide);
    await Assertions.checkIfElementToHaveText(
      carouselSecondSlideTitle,
      'Get a MetaMask card',
    );

    await Gestures.swipe(carouselContainer, 'right', 'slow', 0.7);
    await Assertions.checkIfElementToHaveText(
      carouselFirstSlideTitle,
      'Bridge tokens',
    );
  });

  it('should dismiss a slide', async () => {
    const carouselFirstSlideTitle = await WalletView.carouselFirstSlideTitle;
    const closeButton = await WalletView.carouselCloseButton;

    await Assertions.checkIfVisible(closeButton);
    await Gestures.tap(closeButton);
    await Assertions.checkIfElementToHaveText(
      carouselFirstSlideTitle,
      'Get a MetaMask card',
    );
  });

  it('should handle slide interactions', async () => {
    const carouselSlide = await WalletView.carouselFirstSlide;
    const container = await WalletView.container;

    await Assertions.checkIfVisible(carouselSlide);
    await Gestures.tap(carouselSlide);
    await Assertions.checkIfVisible(container);
  });
});
