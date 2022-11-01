import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";
import { DRAWER_VIEW_LOCK_TEXT_ID } from "../testIDs/Screens/DrawerView.testIds";

class DrawerViewScreen{

    get lockNavBarItem(){
        return Selectors.getElementByPlatform(DRAWER_VIEW_LOCK_TEXT_ID);
    }

    async tapNavBarItemLock(){
        await Gestures.waitAndTap(this.lockNavBarItem)
    }

    async tapYesOnDeviceAlert(){
        await driver.acceptAlert();
    }
}

export default new DrawerViewScreen();
