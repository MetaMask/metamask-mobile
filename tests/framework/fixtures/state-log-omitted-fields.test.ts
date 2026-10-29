import { metadata as cardControllerMetadata } from '../../../app/core/Engine/controllers/card-controller/CardController';
import { metadata as rewardsControllerMetadata } from '../../../app/core/Engine/controllers/rewards-controller/RewardsController';
import { metadata as rewardsMoneyControllerMetadata } from '../../../app/core/Engine/controllers/rewards-money-controller/RewardsMoneyController';
import { metadata as uiSlotsControllerMetadata } from '../../../app/core/Engine/controllers/ui-slots-controller/UiSlotsController';
import { metadata as qrSyncControllerMetadata } from '../../../app/core/QrSync/QrSyncController';
import { STATE_LOG_OMITTED_FIELDS } from './state-log-omitted-fields';

/**
 * Fields the state-log exporter rewrites after metadata filtering. They stay
 * out of STATE_LOG_OMITTED_FIELDS because the exported object still has them.
 * Function sanitizers are also excluded: includeInStateLogs is not `false`.
 */
const REWRITTEN_AFTER_METADATA = {
  CardController: ['cardHomeData', 'cardHomeDataAddress'],
} as const;

const CONTROLLER_METADATA = {
  CardController: cardControllerMetadata,
  RewardsController: rewardsControllerMetadata,
  RewardsMoneyController: rewardsMoneyControllerMetadata,
  UiSlotsController: uiSlotsControllerMetadata,
  QrSyncController: qrSyncControllerMetadata,
} as const;

function fieldsOmittedFromStateLogs(
  metadata: Record<string, { includeInStateLogs: unknown }>,
  rewrittenFields: readonly string[],
): string[] {
  return Object.entries(metadata)
    .filter(
      ([field, entry]) =>
        entry.includeInStateLogs === false && !rewrittenFields.includes(field),
    )
    .map(([field]) => field)
    .sort();
}

describe('STATE_LOG_OMITTED_FIELDS', () => {
  it.each(Object.keys(CONTROLLER_METADATA))(
    'matches includeInStateLogs false fields on %s',
    (controllerName) => {
      const name = controllerName as keyof typeof CONTROLLER_METADATA;
      const metadata = CONTROLLER_METADATA[name];
      const rewrittenFields =
        name in REWRITTEN_AFTER_METADATA
          ? REWRITTEN_AFTER_METADATA[
              name as keyof typeof REWRITTEN_AFTER_METADATA
            ]
          : [];

      expect([...(STATE_LOG_OMITTED_FIELDS[name] ?? [])].sort()).toEqual(
        fieldsOmittedFromStateLogs(metadata, rewrittenFields),
      );

      if (name === 'CardController') {
        for (const field of REWRITTEN_AFTER_METADATA.CardController) {
          expect(cardControllerMetadata[field].includeInStateLogs).toBe(false);
        }
      }
    },
  );
});
