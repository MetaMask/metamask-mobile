/* eslint-disable import/prefer-default-export */
import Matchers from '../../../../../e2e/framework/Matchers';
import Gestures from '../../../../../e2e/framework/Gestures';
import Assertions from '../../../../../e2e/framework/Assertions';
import {
  SampleFeatureSelectorsIDs,
  SampleFeatureSelectorsText,
} from '../selectors/SampleFeature.selectors';

class SampleFeatureView {
  get container(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_FEATURE_CONTAINER,
    ) as Promise<Detox.IndexableNativeElement>;
  }

  get title(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(
      SampleFeatureSelectorsText.SAMPLE_FEATURE_TITLE,
    );
  }

  get description(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(
      SampleFeatureSelectorsText.SAMPLE_FEATURE_DESCRIPTION,
    );
  }

  get counterTitle(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_TITLE,
    ) as Promise<Detox.IndexableNativeElement>;
  }

  get counterValue(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_VALUE,
    ) as Promise<Detox.IndexableNativeElement>;
  }

  get incrementButton(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(
      SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_INCREMENT_BUTTON,
    ) as Promise<Detox.IndexableNativeElement>;
  }

  get networkImage(): Promise<Detox.IndexableNativeElement> {
    // Assuming the network image has a testID
    return Matchers.getElementByID(
      'network-avatar-image',
    ) as Promise<Detox.IndexableNativeElement>;
  }

  // Pet Name Elements
  get petNameAddressInput(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(
      'pet-name-address-input',
    ) as Promise<Detox.IndexableNativeElement>;
  }

  get petNameNameInput(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(
      'pet-name-name-input',
    ) as Promise<Detox.IndexableNativeElement>;
  }

  get addPetNameButton(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(
      'add-pet-name-button',
    ) as Promise<Detox.IndexableNativeElement>;
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
