import { Connection } from '../services/connection';
import {
  IHostApplicationAdapter,
  ShowConnectionLoadingOptions,
} from '../types/host-application-adapter';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';
import { showSimpleNotification } from '../../../actions/notification';
import { strings } from '../../../../locales/i18n';
import { ConnectionInfo } from '../types/connection-info';
import Engine from '../../Engine';
import { Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import logger from '../services/logger';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';

const DEFAULT_CONNECTION_LOADING_AUTODISMISS_MS = 10_000;

/** Longer timeout for multi-step agentic CLI connect (MWP → OTP → dashboard). */
export const AGENTIC_CLI_CONNECTION_LOADING_AUTODISMISS_MS = 15_000;

/**
 * Routes over which the connection loading sheet must NOT be shown:
 * - the lock / login screens (it would cover the unlock UI), and
 * - the account-connect sheet (the approval is already up, so loading is moot).
 * Mirrors the skip list used by the legacy SDK loading state.
 */
const LOADING_SKIP_ROUTES: readonly string[] = [
  Routes.LOCK_SCREEN,
  Routes.ONBOARDING.LOGIN,
  Routes.SHEET.ACCOUNT_CONNECT,
];

export class HostApplicationAdapter implements IHostApplicationAdapter {
  /**
   * Safety auto-dismiss timers per connection id. The loading sheet is normally
   * dismissed explicitly (when the approval is ready, or on success/failure),
   * but we keep a timer so it can never linger if a connection stalls without
   * ever surfacing an approval or error.
   */
  private readonly loadingDismissTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  /**
   * Shows the shared SDK loading bottom sheet (the same Lottie "connecting"
   * sheet used by the legacy SDK) while an incoming MetaMask Connect request is
   * pending — i.e. while the MWP handshake runs and before the approval appears.
   */
  showConnectionLoading(
    conninfo: ConnectionInfo,
    options?: ShowConnectionLoadingOptions,
  ): void {
    const navigation = this.getNavigation();
    if (!navigation) return;

    const currentRoute = navigation.getCurrentRoute?.()?.name;
    if (currentRoute && LOADING_SKIP_ROUTES.includes(currentRoute)) {
      return;
    }

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SDK_LOADING,
    });

    const autodismiss =
      options?.autodismissMs ?? DEFAULT_CONNECTION_LOADING_AUTODISMISS_MS;
    this.clearLoadingTimer(conninfo.id);
    this.loadingDismissTimers.set(
      conninfo.id,
      setTimeout(() => {
        this.loadingDismissTimers.delete(conninfo.id);
        this.dismissLoadingSheet();
      }, autodismiss),
    );
  }

  hideConnectionLoading(conninfo: ConnectionInfo): void {
    this.clearLoadingTimer(conninfo.id);
    this.dismissLoadingSheet();
  }

  /**
   * Dismisses the SDK loading sheet if it is the route currently on top.
   * Mirrors the legacy SDK `hideLoadingState`.
   */
  private dismissLoadingSheet(): void {
    const navigation = this.getNavigation();
    if (!navigation) return;

    const currentRoute = navigation.getCurrentRoute?.()?.name;
    if (currentRoute === Routes.SHEET.SDK_LOADING && navigation.canGoBack?.()) {
      navigation.goBack();
    }
  }

  private clearLoadingTimer(id: string): void {
    const timer = this.loadingDismissTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.loadingDismissTimers.delete(id);
    }
  }

  /**
   * Safely resolves the global navigation reference. Returns undefined if it
   * isn't ready yet (e.g. an early cold-start deeplink), in which case the
   * loading sheet is simply skipped rather than throwing.
   */
  private getNavigation() {
    try {
      return NavigationService.navigation;
    } catch {
      return undefined;
    }
  }

  showConnectionError(conninfo?: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo?.id || Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_error.title'),
        description: strings('sdk_connect_v2.show_error.description'),
        status: 'error',
      }),
    );
  }

  showInternalError(conninfo?: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo?.id || Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_internal_error.title'),
        description: strings('sdk_connect_v2.show_internal_error.description'),
        status: 'error',
      }),
    );
  }

  showMethodError(conninfo?: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo?.id || Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_method_error.title'),
        description: strings('sdk_connect_v2.show_method_error.description'),
        status: 'error',
      }),
    );
  }

  showConfirmationRejectionError(conninfo?: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo?.id || Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_rejection.title'),
        description: strings('sdk_connect_v2.show_rejection.description'),
        status: 'error',
      }),
    );
  }

  showReturnToApp(conninfo: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo.id,
        autodismiss: 3000,
        title: strings('sdk_connect_v2.show_return_to_app.title'),
        description: strings('sdk_connect_v2.show_return_to_app.description'),
        status: 'success',
      }),
    );
  }

  showNotFoundError(): void {
    store.dispatch(
      showSimpleNotification({
        id: Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_not_found.title'),
        description: strings('sdk_connect_v2.show_not_found.description'),
        status: 'error',
      }),
    );
  }

  syncConnectionList(conns: Connection[]): void {
    const v2Sessions: SDKSessions = conns.reduce((acc, conn) => {
      const props: ConnectionProps & { isV2: boolean } = {
        id: conn.id,
        otherPublicKey: '',
        origin: conn.info.metadata.dapp.url,
        originatorInfo: {
          title: conn.info.metadata.dapp.name,
          url: conn.info.metadata.dapp.url,
          icon: conn.info.metadata.dapp.icon,
          dappId: conn.info.metadata.dapp.name,
          apiVersion: conn.info.metadata.sdk.version,
          platform: conn.info.metadata.sdk.platform,
          anonId: conn.info.metadata.analytics?.remote_session_id,
        },
        isV2: true, // Flag to identify this as a V2 connection
      };
      acc[conn.id] = props;
      return acc;
    }, {} as SDKSessions);

    store.dispatch(setSdkV2Connections(v2Sessions));
  }

  /**
   * Revokes {@link Caip25EndowmentPermissionName} permission from a connection / origin.
   * @param connId - The origin of the connection.
   */
  revokePermissions(connId: string): void {
    try {
      Engine.context.PermissionController.revokePermission(
        connId,
        Caip25EndowmentPermissionName,
      );
    } catch {
      logger.error(
        `Failed to revoke ${Caip25EndowmentPermissionName} permission for connection`,
        connId,
      );
    }
  }
}
