///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { createSnapsMethodMiddleware } from '@metamask/snaps-rpc-methods';
import {
  RequestedPermissions,
  SubjectType,
} from '@metamask/permission-controller';
import { SnapRpcHookArgs } from '@metamask/snaps-utils';
import { RestrictedMethods } from '../Permissions/constants';
import { keyringSnapPermissionsBuilder } from '../SnapKeyring/keyringSnapsPermissions';
import { SnapId } from '@metamask/snaps-sdk';
import { RootExtendedMessenger, EngineContext } from '../Engine';
import { handleSnapRequest } from './utils';
import { captureException } from '@sentry/react-native';
import {
  CronjobControllerCancelAction,
  CronjobControllerGetAction,
  SnapControllerClearSnapStateAction,
  SnapControllerGetPermittedSnapsAction,
  SnapControllerGetSnapAction,
  SnapControllerGetSnapFileAction,
  SnapControllerGetSnapStateAction,
  SnapControllerInstallSnapsAction,
  SnapControllerUpdateSnapStateAction,
  SnapInterfaceControllerCreateInterfaceAction,
  SnapInterfaceControllerResolveInterfaceAction,
  SnapInterfaceControllerUpdateInterfaceAction,
  SnapInterfaceControllerUpdateInterfaceStateAction,
  WebSocketServiceOpenAction,
  WebSocketServiceCloseAction,
  WebSocketServiceGetAllAction,
  WebSocketServiceSendMessageAction,
} from '../Engine/controllers/snaps/constants';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MetaMetrics } from '../../../app/core/Analytics';
import { MetricsEventBuilder } from '../Analytics/MetricsEventBuilder';
import { Json } from '@metamask/utils';
import { SchedulableBackgroundEvent } from '@metamask/snaps-controllers';
import { endTrace, trace } from '../../util/trace';
import { AppState } from 'react-native';
import { getVersion } from 'react-native-device-info';

export function getSnapIdFromRequest(
  request: Record<string, unknown>,
): SnapId | null {
  const { snapId } = request;
  return typeof snapId === 'string' ? (snapId as SnapId) : null;
}
// Snaps middleware
/*
    from extension https://github.dev/MetaMask/metamask-extension/blob/1d5e8a78400d7aaaf2b3cbdb30cff9399061df34/app/scripts/metamask-controller.js#L3830-L3861
    */
const snapMethodMiddlewareBuilder = (
  engineContext: EngineContext,
  controllerMessenger: RootExtendedMessenger,
  origin: string,
  subjectType: SubjectType,
) =>
  createSnapsMethodMiddleware(subjectType === SubjectType.Snap, {
    getUnlockPromise: () => {
      if (engineContext.KeyringController.isUnlocked()) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        controllerMessenger.subscribeOnceIf(
          'KeyringController:unlock',
          resolve,
          () => true,
        );
      });
    },
    getSnaps: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetPermittedSnapsAction,
      origin,
    ),
    requestPermissions: async (requestedPermissions: RequestedPermissions) =>
      await engineContext.PermissionController.requestPermissions(
        { origin },
        requestedPermissions,
      ),
    getPermissions: engineContext.PermissionController.getPermissions.bind(
      engineContext.PermissionController,
      origin,
    ),
    hasPermission: engineContext.PermissionController.hasPermission.bind(
      engineContext.PermissionController,
      origin,
    ),
    getAllowedKeyringMethods: keyringSnapPermissionsBuilder(origin),
    getSnapFile: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetSnapFileAction,
      origin as SnapId,
    ),
    installSnaps: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerInstallSnapsAction,
      origin,
    ),
    invokeSnap: engineContext.PermissionController.executeRestrictedMethod.bind(
      engineContext.PermissionController,
      origin,
      RestrictedMethods.wallet_snap,
    ),
    createInterface: controllerMessenger.call.bind(
      controllerMessenger,
      SnapInterfaceControllerCreateInterfaceAction,
      origin as SnapId,
    ),
    updateInterface: controllerMessenger.call.bind(
      controllerMessenger,
      SnapInterfaceControllerUpdateInterfaceAction,
      origin as SnapId,
    ),
    getInterfaceContext: (id: string) =>
      controllerMessenger.call(
        'SnapInterfaceController:getInterface',
        origin as SnapId,
        id,
      ).context,
    getInterfaceState: (id: string) =>
      controllerMessenger.call(
        'SnapInterfaceController:getInterface',
        origin as SnapId,
        id,
      ).state,
    resolveInterface: controllerMessenger.call.bind(
      controllerMessenger,
      SnapInterfaceControllerResolveInterfaceAction,
      origin as SnapId,
    ),
    getSnap: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetSnapAction,
    ),
    trackError: (error: Error) => captureException(error),
    trackEvent: (eventPayload: {
      event: string;
      properties: Record<string, Json>;
      sensitiveProperties: Record<string, Json>;
    }) => {
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder({
          category: eventPayload.event,
          properties: eventPayload.properties,
          sensitiveProperties: eventPayload.sensitiveProperties,
        }).build(),
      );
    },
    openWebSocket: controllerMessenger.call.bind(
      controllerMessenger,
      WebSocketServiceOpenAction,
      origin as SnapId,
    ),
    closeWebSocket: controllerMessenger.call.bind(
      controllerMessenger,
      WebSocketServiceCloseAction,
      origin as SnapId,
    ),
    sendWebSocketMessage: controllerMessenger.call.bind(
      controllerMessenger,
      WebSocketServiceSendMessageAction,
      origin as SnapId,
    ),
    getWebSockets: controllerMessenger.call.bind(
      controllerMessenger,
      WebSocketServiceGetAllAction,
      origin as SnapId,
    ),
    updateInterfaceState: controllerMessenger.call.bind(
      controllerMessenger,
      SnapInterfaceControllerUpdateInterfaceStateAction,
      origin as SnapId,
    ),
    handleSnapRpcRequest: async (request: Omit<SnapRpcHookArgs, 'origin'>) => {
      const snapId = getSnapIdFromRequest(request);

      if (!snapId) {
        throw new Error(
          'snapMethodMiddlewareBuilder handleSnapRpcRequest: Invalid snap request: snapId not found',
        );
      }

      return await handleSnapRequest(controllerMessenger, {
        snapId,
        origin,
        handler: request.handler,
        request: request.request,
      });
    },
    requestUserApproval:
      engineContext.ApprovalController.addAndShowApprovalRequest.bind(
        engineContext.ApprovalController,
      ),
    getIsActive: () =>
      AppState.currentState === 'active' &&
      engineContext.KeyringController.isUnlocked(),
    getIsLocked: () => !engineContext.KeyringController.isUnlocked(),
    getVersion: () => {
      const baseVersion = getVersion();
      const buildType = process.env.METAMASK_BUILD_TYPE;

      if (buildType === 'main' || buildType === 'qa') {
        return baseVersion;
      }

      return `${baseVersion}-${buildType}.0`;
    },
    getEntropySources: () => {
      const state = controllerMessenger.call('KeyringController:getState');

      return state.keyrings
        .map((keyring, index) => {
          if (keyring.type === KeyringTypes.hd) {
            return {
              id: keyring.metadata.id,
              name: keyring.metadata.name,
              type: 'mnemonic',
              primary: index === 0,
            };
          }

          return null;
        })
        .filter(Boolean);
    },
    clearSnapState: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerClearSnapStateAction,
      origin as SnapId,
    ),
    getSnapState: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerGetSnapStateAction,
      origin as SnapId,
    ),
    updateSnapState: controllerMessenger.call.bind(
      controllerMessenger,
      SnapControllerUpdateSnapStateAction,
      origin as SnapId,
    ),
    scheduleBackgroundEvent: (event: SchedulableBackgroundEvent) =>
      controllerMessenger.call('CronjobController:schedule', {
        ...event,
        snapId: origin as SnapId,
      }),
    cancelBackgroundEvent: controllerMessenger.call.bind(
      controllerMessenger,
      CronjobControllerCancelAction,
      origin as SnapId,
    ),
    getBackgroundEvents: controllerMessenger.call.bind(
      controllerMessenger,
      CronjobControllerGetAction,
      origin as SnapId,
    ),
    getNetworkConfigurationByChainId: controllerMessenger.call.bind(
      controllerMessenger,
      'NetworkController:getNetworkConfigurationByChainId',
    ),
    getNetworkClientById: controllerMessenger.call.bind(
      controllerMessenger,
      'NetworkController:getNetworkClientById',
    ),
    startTrace: trace,
    endTrace,
  });

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
