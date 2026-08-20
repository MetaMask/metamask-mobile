/* eslint-disable import-x/prefer-default-export */
import Matchers from '../../../../../tests/framework/Matchers';
import Gestures from '../../../../../tests/framework/Gestures';
import Assertions from '../../../../../tests/framework/Assertions';
import { type EncapsulatedElementType } from '../../../../../tests/framework/EncapsulatedElement';
import {
  SampleFeatureSelectorsIDs,
  SampleFeatureSelectorsText,
} from '../selectors/SampleFeature.selectors';

class SampleFeatureView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_FEATURE_CONTAINER,
    );
  }

  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(
      SampleFeatureSelectorsText.SAMPLE_FEATURE_TITLE,
    );
  }

  get description(): EncapsulatedElementType {
    return Matchers.getElementByText(
      SampleFeatureSelectorsText.SAMPLE_FEATURE_DESCRIPTION,
    );
  }

  get counterTitle(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_TITLE,
    );
  }

  get counterValue(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_VALUE,
    );
  }

  get incrementButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_INCREMENT_BUTTON,
    );
  }

  get networkImage(): EncapsulatedElementType {
    // Assuming the network image has a testID
    return Matchers.getElementByID('network-avatar-image');
  }

  // Pet Name Elements
  get petNameAddressInput(): EncapsulatedElementType {
    return Matchers.getElementByID('pet-name-address-input');
  }

  get petNameNameInput(): EncapsulatedElementType {
    return Matchers.getElementByID('pet-name-name-input');
  }

  get addPetNameButton(): EncapsulatedElementType {
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
