import { Matchers } from '../../../framework';
import { DeveloperOptionsSelectorsText } from '../../../selectors/Settings/DeveloperOptions.selectors';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class DeveloperOptionsView {
  get sampleFeatureButton() {
    return Matchers.getElementByText(
      DeveloperOptionsSelectorsText.NAVIGATE_TO_SAMPLE_FEATURE,
    );
  }

  async tapSampleFeature(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.sampleFeatureButton);
  }
}

export default new DeveloperOptionsView();
