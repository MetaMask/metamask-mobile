  import Selectors from '../../helpers/Selectors';
  import Gestures from '../../helpers/Gestures';

class AddNetworksModal {

    get AddNetworksButton() {
        return Selectors.getElementByPlatform('add-network-button', true);
      }

    async clickAddNetworks(){
        await Gestures.tap(this.AddNetworksButton);
    }
}
export default new AddNetworksModal();
