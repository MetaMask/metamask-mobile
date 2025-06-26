import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import Assertions from "../../utils/Assertions";

class PhishingModal {

    private get modalTitle() {
        return Matchers.getElementByText('This website might be harmful')
    }

    async verifyModalIsVisible() {
        await Assertions.checkIfVisible(this.modalTitle);
    }

    async verifyModalIsHidden() {
        await Assertions.checkIfNotVisible(this.modalTitle);
    }

    async tapBackToSafetyButton() {
        await Gestures.waitAndTap(Matchers.getElementByText('Back to safety'));
    }
}

export default new PhishingModal();
