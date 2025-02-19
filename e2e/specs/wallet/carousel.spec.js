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

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should display carousel with correct slides', async () => {
    const carouselContainer = await Matchers.getElementByID(
      WalletView.carouselContainer,
    );
    const carouselFirstSlide = await Matchers.getElementByID(
      WalletView.carouselFirstSlide,
    );
    const carouselFirstSlideTitle = await Matchers.getElementByID(
      WalletView.carouselFirstSlideTitle,
    );
    const carouselProgressDots = await Matchers.getElementByID(
      WalletView.carouselProgressDots,
    );

    await Assertions.checkIfVisible(carouselContainer);
    await Assertions.checkIfVisible(carouselFirstSlide);
    await Assertions.checkIfElementToHaveText(
      carouselFirstSlideTitle,
      'Bridge tokens',
    );
    await Assertions.checkIfVisible(carouselProgressDots);
  });

  it('should navigate between slides', async () => {
    const carouselContainer = await Matchers.getElementByID(
      WalletView.carouselContainer,
    );
    const carouselSecondSlide = await Matchers.getElementByID(
      WalletView.carouselSecondSlide,
    );
    const carouselSecondSlideTitle = await Matchers.getElementByID(
      WalletView.carouselSecondSlideTitle,
    );
    const carouselFirstSlideTitle = await Matchers.getElementByID(
      WalletView.carouselFirstSlideTitle,
    );

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
    const carouselFirstSlideTitle = await Matchers.getElementByID(
      WalletView.carouselFirstSlideTitle,
    );
    const closeButton = await Matchers.getElementByID(
      WalletView.carouselCloseButton,
    );

    await Gestures.tap(closeButton);
    await Assertions.checkIfElementToHaveText(
      carouselFirstSlideTitle,
      'Get a MetaMask card',
    );
  });

  it('should handle slide interactions', async () => {
    const carouselSlide = await Matchers.getElementByID(
      WalletView.carouselSlide,
    );
    const container = await Matchers.getElementByID(WalletView.container);

    await Gestures.tap(carouselSlide);
    await Assertions.checkIfVisible(container);
  });
});
