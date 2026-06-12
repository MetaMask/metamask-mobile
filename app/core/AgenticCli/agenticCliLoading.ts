import { store } from '../../store';
import {
  hideNotificationById,
  showSimpleNotification,
} from '../../actions/notification';
import { strings } from '../../../locales/i18n';
import { ConnectionInfo } from '../SDKConnectV2/types/connection-info';

const AGENTIC_CLI_LOADING_AUTODISMISS_MS = 15_000;

export const showAgenticCliConnectionLoading = (
  conninfo: ConnectionInfo,
): void => {
  store.dispatch(
    showSimpleNotification({
      id: conninfo.id,
      autodismiss: AGENTIC_CLI_LOADING_AUTODISMISS_MS,
      title: strings('sdk_connect_v2.show_loading.title'),
      description: strings('sdk_connect_v2.show_loading.description', {
        dappName: conninfo.metadata.dapp.name,
      }),
      status: 'pending',
    }),
  );
};

export const hideAgenticCliConnectionLoading = (
  conninfo: ConnectionInfo,
): void => {
  store.dispatch(hideNotificationById(conninfo.id));
};
