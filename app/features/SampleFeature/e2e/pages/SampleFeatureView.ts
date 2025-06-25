import Matchers from '../../../../../e2e/utils/Matchers';
import Gestures from '../../../../../e2e/utils/Gestures';
import Assertions from '../../../../../e2e/utils/Assertions';
import {
  SampleFeatureSelectorsIDs,
  SampleFeatureSelectorsText,
} from '../selectors/SampleFeature.selectors';

class SampleFeatureView {
  get container() {
    return Matchers.getElementByID(SampleFeatureSelectorsIDs.SAMPLE_FEATURE_CONTAINER);
  }

  get title() {
    return Matchers.getElementByText(SampleFeatureSelectorsText.SAMPLE_FEATURE_TITLE);
  }

  get description() {
    return Matchers.getElementByText(SampleFeatureSelectorsText.SAMPLE_FEATURE_DESCRIPTION);
  }

  get counterTitle() {
    return Matchers.getElementByID(SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_TITLE);
  }

  get counterValue() {
    return Matchers.getElementByID(SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_VALUE);
  }

  get incrementButton() {
    return Matchers.getElementByID(SampleFeatureSelectorsIDs.SAMPLE_COUNTER_PANE_INCREMENT_BUTTON);
  }

  get networkImage() {
    // Assuming the network image has a testID
    return Matchers.getElementByID('network-avatar-image');
  }

  async tapIncrementButton(): Promise<void> {
    await Gestures.waitAndTap(this.incrementButton);
  }

  async isVisible(): Promise<void> {
    await Assertions.checkIfVisible(this.container);
  }
}

export default new SampleFeatureView(); 