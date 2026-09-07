/* eslint-disable import-x/prefer-default-export */
import Matchers from '../../../../../tests/framework/Matchers';
import Gestures from '../../../../../tests/framework/Gestures';
import Assertions from '../../../../../tests/framework/Assertions';
import type { AppiumElement } from '../../../../../tests/framework/AppiumElement';
import {
  SampleFeatureSelectorsIDs,
  SampleFeatureSelectorsText,
} from '../selectors/SampleFeature.selectors';

class SampleFeatureView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_FEATURE_CONTAINER,
    );
  }

  get title(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      SampleFeatureSelectorsText.SAMPLE_FEATURE_TITLE,
    );
  }

  get description(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      SampleFeatureSelectorsText.SAMPLE_FEATURE_DESCRIPTION,
    );
  }

  get counterTitle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_TITLE,
    );
  }

  get counterValue(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_VALUE,
    );
  }

  get incrementButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_INCREMENT_BUTTON,
    );
  }

  get networkImage(): Promise<AppiumElement> {
    // Assuming the network image has a testID
    return Matchers.getElementByID('network-avatar-image');
  }

  // Pet Name Elements
  get petNameAddressInput(): Promise<AppiumElement> {
    return Matchers.getElementByID('pet-name-address-input');
  }

  get petNameNameInput(): Promise<AppiumElement> {
    return Matchers.getElementByID('pet-name-name-input');
  }

  get addPetNameButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('add-pet-name-button');
  }

  async tapIncrementButton(): Promise<void> {
    await Gestures.waitAndTap(this.incrementButton);
  }

  async tapAddPetNameButton(): Promise<void> {
    await Gestures.waitAndTap(this.addPetNameButton);
  }

  async enterPetNameAddress(address: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.petNameAddressInput, address);
  }

  async enterPetNameName(name: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.petNameNameInput, name);
  }

  async isVisible(): Promise<void> {
    await Assertions.checkIfVisible(this.container);
  }
}

export default new SampleFeatureView();
