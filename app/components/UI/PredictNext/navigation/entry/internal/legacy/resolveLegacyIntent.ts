import type { NavigatorScreenParams } from '@react-navigation/native';
import Routes from '../../../../../../../constants/navigation/Routes';
import type {
  PredictPositionsTabKey,
  PredictStackParamList,
} from '../../../../../Predict/types/navigation';
import type { PredictRootScreenParamList } from '../../../appRoutes';
import { readPredictEventRef } from '../../eventRef';
import type {
  PredictEntryPoint,
  PredictIntent,
  PredictPortfolioIntentTab,
} from '../../intents';
import {
  ready,
  unavailable,
  type PredictIntentResolution,
} from '../../targets';

const LEGACY_POSITIONS_TABS: Record<
  PredictPortfolioIntentTab,
  PredictPositionsTabKey
> = {
  positions: 'positions',
  activity: 'history',
};

const withEntryPoint = (entryPoint?: PredictEntryPoint) =>
  entryPoint === undefined ? {} : { entryPoint };

/**
 * A legacy stack screen through the `Predict` root route. Empty params are
 * omitted, the way callers navigated before intents (`{ screen }` alone).
 */
const legacyScreen = <TScreen extends keyof PredictStackParamList>(
  screen: TScreen,
  params: NonNullable<PredictStackParamList[TScreen]>,
): PredictIntentResolution =>
  ready({
    kind: 'predict',
    params: (Object.keys(params).length > 0
      ? { screen, params }
      : { screen }) as NavigatorScreenParams<PredictRootScreenParamList>,
  });

/**
 * The legacy Polymarket branch: today's routes and params, unchanged. A
 * caller that moves to intents produces exactly the navigation it made
 * before, including its analytics params.
 */
export const resolveLegacyIntent = (
  intent: PredictIntent,
): PredictIntentResolution => {
  switch (intent.type) {
    case 'home':
      return legacyScreen(Routes.PREDICT.MARKET_LIST, {
        ...withEntryPoint(intent.entryPoint),
        ...(intent.transactionActiveAbTests?.length
          ? { transactionActiveAbTests: intent.transactionActiveAbTests }
          : {}),
      });
    case 'feed':
      return legacyScreen(Routes.PREDICT.MARKET_LIST, {
        ...withEntryPoint(intent.entryPoint),
        tab: intent.category,
      });
    case 'event': {
      const eventRef = readPredictEventRef(intent.eventRef);
      if (eventRef.implementation !== 'legacy') {
        return unavailable('venueMismatch');
      }
      return ready({
        kind: 'legacyMarketDetails',
        params: {
          marketId: eventRef.marketId,
          providerId: eventRef.providerId,
          ...withEntryPoint(intent.entryPoint),
          ...(intent.titleSnapshot === undefined
            ? {}
            : { title: intent.titleSnapshot }),
          ...(intent.imageSnapshot === undefined
            ? {}
            : { image: intent.imageSnapshot }),
        },
      });
    }
    case 'portfolio':
      return legacyScreen(Routes.PREDICT.POSITIONS, {
        ...withEntryPoint(intent.entryPoint),
        ...(intent.tab
          ? { initialTab: LEGACY_POSITIONS_TABS[intent.tab] }
          : {}),
      });
    case 'addFunds':
      return ready({
        kind: 'predictModals',
        params:
          intent.autoDeposit === undefined
            ? { screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET }
            : {
                screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
                params: { autoDeposit: intent.autoDeposit },
              },
      });
  }
};
