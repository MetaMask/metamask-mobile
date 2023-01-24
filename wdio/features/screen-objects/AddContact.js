import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { CONTACT_NAME_INPUT,
     CONTACT_ADD_BUTTON, 
     CONTACT_ADDRESS_INPUT,
       } from '../../features/testIDs/Screens/Contacts.testids';

class Contacts {

    get contactInputfield() {
        return Selectors.getElementByPlatform(CONTACT_NAME_INPUT);
    }

    get addressInputField() {
        return Selectors.getElementByPlatform(CONTACT_ADDRESS_INPUT);
    }

    get addContactButton() {
        return Selectors.getElementByPlatform(CONTACT_ADD_BUTTON);
    }

    get contactOverviewNameInput() {
        return Selectors.getElementByPlatform(CONTACT_NAME_INPUT);
    }

    async isContactsScreenDisplayed() {
        expect(await Selectors.getXpathElementByContentDescription('add-contact-button')).toBeDisplayed();
    }

    async isAddContactButtonEnabled() {
        expect(await Selectors.getElementByPlatform(CONTACT_ADD_BUTTON)).toBeEnabled();
    }

    async tapOnAddContactButton() {
        await Gestures.tap(this.addContactButton);
        await Gestures.tap(this.addContactButton);
    }

    async fillContactNamefield(name) {
        await Gestures.typeText(this.contactInputfield, name);
    }

    async fillAddressField(address) {
        await Gestures.typeText(this.addressInputField, address);
    }

    async tapOnText(text){
        await Gestures.tapTextByXpath(text);
     }

    async changeContactName(newName) {
        await Gestures.typeText(this.contactOverviewNameInput, newName);
    }
}
export default new Contacts();
