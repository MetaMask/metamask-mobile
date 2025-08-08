import {
  PerpsPositionsViewSelectorsIDs,
  PerpsPositionCardSelectorsIDs,
  PerpsPositionHeaderSelectorsIDs,
  PerpsLoaderSelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PerpsView {
  get container() {
    return Matchers.getElementByID(PerpsPositionsViewSelectorsIDs.CONTAINER);
  }

  get positionsContainer() {
    return Matchers.getElementByID(
      PerpsPositionsViewSelectorsIDs.POSITIONS_CONTAINER,
    );
  }

  get noPositionsContainer() {
    return Matchers.getElementByID(
      PerpsPositionsViewSelectorsIDs.NO_POSITIONS_CONTAINER,
    );
  }

  get noPositionsTitle() {
    return Matchers.getElementByID(
      PerpsPositionsViewSelectorsIDs.NO_POSITIONS_TITLE,
    );
  }

  get noPositionsDescription() {
    return Matchers.getElementByID(
      PerpsPositionsViewSelectorsIDs.NO_POSITIONS_DESCRIPTION,
    );
  }

  get startTradingButton() {
    return Matchers.getElementByID(
      PerpsPositionsViewSelectorsIDs.START_TRADING_BUTTON,
    );
  }

  get loader() {
    return Matchers.getElementByID(PerpsLoaderSelectorsIDs.FULLSCREEN);
  }

  get inlineLoader() {
    return Matchers.getElementByID(PerpsLoaderSelectorsIDs.INLINE);
  }

  // Position Card Elements
  get positionCard() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.CARD);
  }

  get positionCardCoin() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.COIN);
  }

  get positionCardSize() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.SIZE);
  }

  get positionCardPnL() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.PNL);
  }

  get positionCardCloseButton() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON);
  }

  get positionCardEditButton() {
    return Matchers.getElementByID(PerpsPositionCardSelectorsIDs.EDIT_BUTTON);
  }

  // Position Header Elements
  get positionHeader() {
    return Matchers.getElementByID(PerpsPositionHeaderSelectorsIDs.HEADER);
  }

  get positionHeaderCoin() {
    return Matchers.getElementByID(PerpsPositionHeaderSelectorsIDs.COIN);
  }

  get positionHeaderPnL() {
    return Matchers.getElementByID(PerpsPositionHeaderSelectorsIDs.PNL);
  }

  get positionHeaderBackButton() {
    return Matchers.getElementByID(PerpsPositionHeaderSelectorsIDs.BACK_BUTTON);
  }

  // Actions
  async tapStartTradingButton() {
    await Gestures.waitAndTap(this.startTradingButton);
  }

  async tapPositionCard() {
    await Gestures.waitAndTap(this.positionCard);
  }

  async tapClosePositionButton() {
    await Gestures.waitAndTap(this.positionCardCloseButton);
  }

  async tapEditPositionButton() {
    await Gestures.waitAndTap(this.positionCardEditButton);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.positionHeaderBackButton);
  }

  async waitForPositionsToLoad() {
    await Gestures.waitAndTap(this.container);
  }

  async waitForNoPositionsState() {
    await Gestures.waitAndTap(this.noPositionsContainer);
  }
}

export default new PerpsView();
