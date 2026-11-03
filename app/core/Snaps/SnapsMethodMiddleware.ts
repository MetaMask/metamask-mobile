///: BEGIN:ONLY_INCLUDE_IF(snaps)
import {
  createSnapsMethodMiddleware,
  type PermittedRpcMethodHooks,
} from '@metamask/snaps-rpc-methods';
import { SubjectType } from '@metamask/permission-controller';
import { Json } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { AppState } from 'react-native';
import { getVersion } from 'react-native-device-info';

import { SOLANA_WALLET_SNAP_ID } from '../SnapKeyring/SolanaWalletSnap';
import { keyringSnapPermissionsBuilder } from '../SnapKeyring/keyringSnapsPermissions';
import { RootExtendedMessenger, GlobalActions, GlobalEvents } from '../Engine';
import Logger from '../../util/Logger';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { endTrace, trace } from '../../util/trace';

const UNSUPPORTED_PROGRAM_ADDRESS_MESSAGE = 'Unsupported program address';
const SOLANA_ERROR_NAME = 'SolanaError';
const SOLANA_ERROR_8500000_MESSAGE_PREFIX = 'Solana error #8500000;';
const STALE_BACKGROUND_EVENT_MESSAGE_PREFIX =
  'A background event with the id of "';
const STALE_BACKGROUND_EVENT_MESSAGE_SUFFIX = '" does not exist.';
const HANDLED_SNAP_FALLBACK_LOG_MESSAGE =
  'Dropped handled Solana snap fallback error';

const HANDLED_SNAP_FALLBACK_PATTERNS = [
  {
    // 5ZQH, 12HES. remove when the upstream snap fix ships.
    id: 'UNSUPPORTED_PROGRAM_ADDRESS',
    matcher: (error: Error) =>
      error.message === UNSUPPORTED_PROGRAM_ADDRESS_MESSAGE,
  },
  {
    // 9CTR, 12HEW. remove when the upstream snap fix ships.
    id: 'SOLANA_ERROR_8500000',
    matcher: (error: Error) =>
      error.name === SOLANA_ERROR_NAME &&
      error.message.startsWith(SOLANA_ERROR_8500000_MESSAGE_PREFIX),
  },
  {
    // 5ZQJ, 10EA7, 109XH. remove when the upstream snap fix ships.
    // A bare "Unknown error" does not match; only the cron id sentence does.
    id: 'STALE_BACKGROUND_EVENT',
    matcher: (error: Error) =>
      error.message.startsWith(STALE_BACKGROUND_EVENT_MESSAGE_PREFIX) &&
      error.message.endsWith(STALE_BACKGROUND_EVENT_MESSAGE_SUFFIX),
  },
];

function isHandledSnapFallbackError(origin: string, error: Error) {
  if (origin !== SOLANA_WALLET_SNAP_ID) {
    return undefined;
  }

  const candidates = [error];
  if (error.cause instanceof Error) {
    candidates.push(error.cause);
  }

  for (const candidate of candidates) {
    for (const pattern of HANDLED_SNAP_FALLBACK_PATTERNS) {
      if (pattern.matcher(candidate)) {
        return pattern;
      }
    }
  }

  return undefined;
}

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
) =>
  createSnapsMethodMiddleware(
    subjectType === SubjectType.Snap,
    {
      getUnlockPromise: async () => {
        if (controllerMessenger.call('KeyringController:isUnlocked')) {
          return;
        }
        await controllerMessenger.waitUntil('KeyringController:unlock');
      },
      getAllowedKeyringMethods: keyringSnapPermissionsBuilder(origin),
      // Website origins are full dapp URLs, and Sentry tags skip URL scrubbing.
      trackError: (error: Error) => {
        if (subjectType !== SubjectType.Snap) {
          return captureException(error);
        }

        const handledPattern = isHandledSnapFallbackError(origin, error);
        if (handledPattern) {
          // The message can carry transaction data, so log the pattern id only.
          Logger.log(
            HANDLED_SNAP_FALLBACK_LOG_MESSAGE,
            handledPattern.id,
            origin,
          );
          // The snap ignores this id. '' stays a string the hook type allows.
          return '';
        }

        return captureException(error, {
          tags: { feature: 'snaps', snap_id: origin },
        });
      },
      trackEvent: trackSnapEvent,
      getIsActive: () =>
        AppState.currentState === 'active' &&
        controllerMessenger.call('KeyringController:isUnlocked'),
      getVersion: () => {
        const baseVersion = getVersion();
        const buildType = process.env.METAMASK_BUILD_TYPE;

        if (buildType === 'main' || buildType === 'qa') {
          return baseVersion;
        }

        return `${baseVersion}-${buildType}.0`;
      },
      getMessenger: ({ actions, events }) =>
        controllerMessenger.buildChild<string, GlobalActions, GlobalEvents>({
          namespace: origin,
          actions: (actions ?? []) as GlobalActions['type'][],
          events: (events ?? []) as GlobalEvents['type'][],
        }) as ReturnType<PermittedRpcMethodHooks['getMessenger']>,
      // @ts-expect-error Type 'string' is not assignable to type 'TraceName'.
      startTrace: trace,
      // @ts-expect-error Type 'string' is not assignable to type 'TraceName'.
      endTrace,
    },
    controllerMessenger,
  );

export default snapMethodMiddlewareBuilder;
///: END:ONLY_INCLUDE_IF
