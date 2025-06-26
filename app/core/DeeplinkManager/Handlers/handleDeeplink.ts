import { checkForDeeplink } from "../../../actions/user";
import { store } from "../../../store";
import Logger from "../../../util/Logger";
import { AppStateEventProcessor } from "../../AppStateEventListener";

export function handleDeeplink(opts: {
  uri?: string;
}) {
 const { dispatch } = store;
 const {uri} = opts;
 try {
   if (uri && typeof uri === 'string') {
     AppStateEventProcessor.setCurrentDeeplink(uri);
     dispatch(checkForDeeplink());
   }
 } catch (e) {
   Logger.error(e as Error, `Deeplink: Error parsing deeplink`);
 }
}