///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { createSnapsMethodMiddleware } from '@metamask/snaps-rpc-methods';
import { SubjectType } from '@metamask/permission-controller';
import { Json } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { AppState } from 'react-native';
import { getVersion } from 'react-native-device-info';

import { keyringSnapPermissionsBuilder } from '../SnapKeyring/keyringSnapsPermissions';
import { RootExtendedMessenger, EngineContext } from '../Engine';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { endTrace, trace } from '../../util/trace';

export const trackSnapEvent = (eventPayload: {
  event: string;
  properties: Record<string, Json>;
  sensitiveProperties: Record<string, Json>;
}) => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(eventPayload.event)
      .addProperties(eventPayload.properties)
      .addSensitiveProperties(eventPayload.sensitiveProperties)
      .build(),
  );
};

const snapMethodMiddlewareBuilder = (
  engineContext: EngineContext,
  controllerMessenger: RootExtendedMessenger,
  origin: string,
  subjectType: SubjectType,
) =>
  createSnapsMethodMiddleware(
    subjectType === SubjectType.Snap,
    {
      getUnlockPromise: async () => {
        if (engineContext.KeyringController.isUnlocked()) {
          return;
        }
        await controllerMessenger.waitUntil('KeyringController:unlock');
      },
      getAllowedKeyringMethods: keyringSnapPermissionsBuilder(origin),
      trackError: (error: Error) => captureException(error),
      trackEvent: trackSnapEvent,
      getIsActive: () =>
        AppState.currentState === 'active' &&
        engineContext.KeyringController.isUnlocked(),
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
    },
    controllerMessenger,
  );

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
