import {
  PerpsOrderViewSelectorsIDs,
  PerpsOrderHeaderSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
  PerpsBottomSheetTooltipSelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PerpsOrderView {
  // Order header elements
  get orderHeader() {
    return Matchers.getElementByID(PerpsOrderHeaderSelectorsIDs.HEADER);
  }

  get assetTitle() {
    return Matchers.getElementByID(PerpsOrderHeaderSelectorsIDs.ASSET_TITLE);
  }

  // Amount display
  get amountDisplay() {
    return Matchers.getElementByID(PerpsAmountDisplaySelectorsIDs.CONTAINER);
  }

  // Info icons
  get leverageInfoIcon() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.LEVERAGE_INFO_ICON,
    );
  }

  get marginInfoIcon() {
    return Matchers.getElementByID(PerpsOrderViewSelectorsIDs.MARGIN_INFO_ICON);
  }

  get liquidationPriceInfoIcon() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_INFO_ICON,
    );
  }

  get feesInfoIcon() {
    return Matchers.getElementByID(PerpsOrderViewSelectorsIDs.FEES_INFO_ICON);
  }

  // Bottom sheet tooltip
  get bottomSheetTooltip() {
    return Matchers.getElementByID(
      PerpsOrderViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP,
    );
  }

  get tooltipTitle() {
    return Matchers.getElementByID(PerpsBottomSheetTooltipSelectorsIDs.TITLE);
  }

  get tooltipContent() {
    return Matchers.getElementByID(PerpsBottomSheetTooltipSelectorsIDs.CONTENT);
  }

  get tooltipGotItButton() {
    return Matchers.getElementByID(
      PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
    );
  }

  // Actions
  async tapLeverageInfoIcon() {
    await Gestures.waitAndTap(this.leverageInfoIcon);
  }

  async tapMarginInfoIcon() {
    await Gestures.waitAndTap(this.marginInfoIcon);
  }

  async tapLiquidationPriceInfoIcon() {
    await Gestures.waitAndTap(this.liquidationPriceInfoIcon);
  }

  async tapFeesInfoIcon() {
    await Gestures.waitAndTap(this.feesInfoIcon);
  }

  async tapTooltipGotItButton() {
    await Gestures.waitAndTap(this.tooltipGotItButton);
  }

  async waitForOrderViewToLoad() {
    await Gestures.waitAndTap(this.orderHeader);
  }

  async waitForTooltipToAppear() {
    await Gestures.waitAndTap(this.bottomSheetTooltip);
  }
}

export default new PerpsOrderView();
