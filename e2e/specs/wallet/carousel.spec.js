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
    await Assertions.checkIfVisible(WalletView.carouselContainer);
    await Assertions.checkIfVisible(WalletView.carouselFirstSlide);
    await Assertions.checkIfElementToHaveText(
      WalletView.carouselFirstSlideTitle,
      'Bridge tokens',
    );
    await Assertions.checkIfVisible(WalletView.carouselProgressDots);
  });

  it('should navigate between slides', async () => {
    await TestHelpers.swipeLeft(WalletView.carouselContainer);
    await Assertions.checkIfVisible(WalletView.carouselSecondSlide);
    await Assertions.checkIfElementToHaveText(
      WalletView.carouselSecondSlideTitle,
      'Get a MetaMask card',
    );
    await TestHelpers.swipeRight(WalletView.carouselContainer);
    await Assertions.checkIfElementToHaveText(
      WalletView.carouselFirstSlideTitle,
      'Bridge tokens',
    );
  });

  it('should dismiss a slide', async () => {
    await WalletView.tapCarouselCloseButton();
    await Assertions.checkIfElementToHaveText(
      WalletView.carouselFirstSlideTitle,
      'Get a MetaMask card',
    );
  });

  it('should handle slide interactions', async () => {
    await WalletView.tapCarouselSlide();
    await Assertions.checkIfVisible(WalletView.container);
  });
});
