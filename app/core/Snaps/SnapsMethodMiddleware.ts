///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { createSnapsMethodMiddleware } from '@metamask/snaps-rpc-methods';
import { SubjectType } from '@metamask/permission-controller';
import { Json } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { AppState } from 'react-native';
import { getVersion } from 'react-native-device-info';
import { KeyringTypes } from '@metamask/keyring-controller';

import { keyringSnapPermissionsBuilder } from '../SnapKeyring/keyringSnapsPermissions';
import { RootExtendedMessenger, EngineContext } from '../Engine';
import Engine from '../Engine/Engine';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { endTrace, trace } from '../../util/trace';

export const trackSnapEvent = (eventPayload: {
  event: string;
  properties?: Record<string, Json>;
  sensitiveProperties?: Record<string, Json>;
}) => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(eventPayload.event)
      .addProperties(eventPayload.properties)
      .addSensitiveProperties(eventPayload.sensitiveProperties)
      .build(),
  );
};

const snapMethodMiddlewareBuilder = (
  controllerMessenger: RootExtendedMessenger,
  origin: string,
  subjectType: SubjectType,
) => {
  const isKeyringUnlocked = () => {
    try {
      const isUnlocked = controllerMessenger.call(
        'KeyringController:isUnlocked',
      );
      if (typeof isUnlocked === 'boolean') {
        return isUnlocked;
      }
    } catch {
      // Fall through to the controller instance below.
    }

    return Engine.context.KeyringController.isUnlocked();
  };

  return createSnapsMethodMiddleware(subjectType === SubjectType.Snap, {
    getUnlockPromise: async () => {
      if (isKeyringUnlocked()) {
        return;
      }
      await controllerMessenger.waitUntil('KeyringController:unlock');
    },
    getAllowedKeyringMethods: keyringSnapPermissionsBuilder(origin),
    trackError: (error: Error) => captureException(error),
    trackEvent: trackSnapEvent,
    getIsActive: () =>
      AppState.currentState === 'active' && isKeyringUnlocked(),
    getIsLocked: () => !isKeyringUnlocked(),
    hasPermission: (permissionName: string) =>
      controllerMessenger.call(
        'PermissionController:hasPermission',
        origin,
        permissionName,
      ),
    getEntropySources: () =>
      controllerMessenger
        .call('KeyringController:getState')
        .keyrings.filter((keyring) => keyring.type === KeyringTypes.hd)
        .map((keyring, index) => ({
          id: keyring.metadata.id,
          name: keyring.metadata.name ?? `Secret Recovery Phrase ${index + 1}`,
          type: 'mnemonic',
          primary: index === 0,
        })),
    getVersion: () => {
      const baseVersion = getVersion();
      const buildType = process.env.METAMASK_BUILD_TYPE;

      if (buildType === 'main' || buildType === 'qa') {
        return baseVersion;
      }

      return `${baseVersion}-${buildType}.0`;
    },
    startTrace: trace,
    endTrace,
  });
};

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
