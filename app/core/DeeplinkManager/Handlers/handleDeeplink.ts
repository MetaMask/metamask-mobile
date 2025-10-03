import { checkForDeeplink } from '../../../actions/user';
import Logger from '../../../util/Logger';
import { AppStateEventProcessor } from '../../AppStateEventListener';
import ReduxService from '../../redux';

export function handleDeeplink(opts: { uri?: string }) {
  const { dispatch } = ReduxService.store;
  const { uri } = opts;
  try {
    if (uri && typeof uri === 'string') {
      AppStateEventProcessor.setCurrentDeeplink(uri);
      dispatch(checkForDeeplink());
    }
  } catch (e) {
    Logger.error(e as Error, `Deeplink: Error parsing deeplink`);
  }
}
