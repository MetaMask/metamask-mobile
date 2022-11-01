import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';


class NetworkApprovalModal {

    get ApproveNetworkModal() {
        return Selectors.getElementByPlatform('approve-network-modal', true);
    }

    get ApproveNetworkApproveButton() {
        return Selectors.getElementByPlatform('approve-network-approve-button', true);
    }
    get CloseNetworkButton() {
        return Selectors.getElementByPlatform('close-network-button', true);
    }

    get SwitchToNetworkButton() {
        return Selectors.getElementByPlatform('switch-to-network-button', true);
    }

    async isApproveNetworkModal() {
        await expect(this.ApproveNetworkModal).toBeDisplayed();
    }

    async isApproveNetworkButton() {
        await expect(this.ApproveNetworkApproveButton).toBeDisplayed();
    }

    async isCloseNetworkButton() {
        await expect(this.CloseNetworkButton).toBeDisplayed();
    }

    async tapApproveButton() {
        await Gestures.tap(this.ApproveNetworkApproveButton);
    }

    async tapSwitchToNetwork() {
        await Gestures.tap(this.SwitchToNetworkButton);
    }
}
export default new NetworkApprovalModal();