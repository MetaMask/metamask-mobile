import { Matchers, Gestures } from '../../../framework';
import { DeveloperOptionsSelectorsText } from '../../../selectors/Settings/DeveloperOptions.selectors.ts';

class DeveloperOptionsView {
  get sampleFeatureButton() {
    return Matchers.getElementByText(
      DeveloperOptionsSelectorsText.NAVIGATE_TO_SAMPLE_FEATURE,
    );
  }

  async tapSampleFeature(): Promise<void> {
    await Gestures.waitAndTap(this.sampleFeatureButton);
  }
}

export default new DeveloperOptionsView();
