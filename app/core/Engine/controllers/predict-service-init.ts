import packageJSON from '../../../../package.json';
import {
  KalshiRemoteAdapter,
  KALSHI_VENUE_ID,
} from '../../../components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../../../components/UI/PredictNext/adapters/remote/PredictApiReadClient';
import { PredictLiveDataClient } from '../../../components/UI/PredictNext/adapters/remote/PredictLiveDataClient';
import {
  PredictLiveDataService,
  type PredictLiveDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictLiveDataService';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import {
  PredictOrderService,
  type PredictOrderServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictOrderService';
import {
  PredictPortfolioService,
  type PredictPortfolioServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictPortfolioService';
import type { PredictLiveDataServiceInitMessenger } from '../messengers/predict-live-data-service-messenger';
import type { PredictMarketDataServiceInitMessenger } from '../messengers/predict-market-data-service-messenger';
import type { PredictOrderServiceInitMessenger } from '../messengers/predict-order-service-messenger';
import type { PredictPortfolioServiceInitMessenger } from '../messengers/predict-portfolio-service-messenger';
import { subscribeToActiveVenueChanges } from '../../../components/UI/PredictNext/implementation/subscribeToActiveVenueChanges';
import { store } from '../../../store';
import type { MessengerClientInitFunction } from '../types';
import StorageWrapper from '../../../store/storage-wrapper';
import { createOrderDispatchJournal } from '../../../components/UI/PredictNext/services/internal/orderDispatchJournal';
import { bindOrderRecoveryLifecycle } from '../../../components/UI/PredictNext/services/internal/orderRecoveryLifecycle';
import { parsePredictConfig, resolveVenueAuthProfile } from '../../../components/UI/PredictNext/config/predictConfig';

export const predictMarketDataServiceInit: MessengerClientInitFunction<
  PredictMarketDataService,
  PredictMarketDataServiceMessenger,
  PredictMarketDataServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: process.env.MM_PREDICT_API_URL,
      clientVersion: packageJSON.version,
      getBearerToken: () =>
        initMessenger.call('AuthenticationController:getBearerToken'),
    }),
  );
  return {
    controller: new PredictMarketDataService({
      messenger: controllerMessenger,
      marketData: adapter.marketData,
      venueId: adapter.venueId,
    }),
  };
};

export const predictLiveDataServiceInit: MessengerClientInitFunction<
  PredictLiveDataService,
  PredictLiveDataServiceMessenger,
  PredictLiveDataServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const controller = new PredictLiveDataService({
    messenger: controllerMessenger,
    venueId: KALSHI_VENUE_ID,
    resolveEvent: (venueId, eventId) =>
      initMessenger.call('PredictMarketDataService:getEvent', venueId, eventId),
    createClient: ({ onGameUpdate, onQuoteUpdate }) =>
      new PredictLiveDataClient({
        baseUrl: process.env.MM_PREDICT_API_URL,
        getBearerToken: () =>
          initMessenger.call('AuthenticationController:getBearerToken'),
        onGameUpdate,
        onQuoteUpdate,
      }),
  });

  return { controller };
};

export const predictPortfolioServiceInit: MessengerClientInitFunction<
  PredictPortfolioService,
  PredictPortfolioServiceMessenger,
  PredictPortfolioServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: process.env.MM_PREDICT_API_URL,
      clientVersion: packageJSON.version,
      getBearerToken: () =>
        initMessenger.call('AuthenticationController:getBearerToken'),
      // Balance and position reads are device-signed; without signRead the
      // client refuses to send them (PredictRequestNotSentError) and the
      // balance card always shows the generic error.
      signRead: (proposed) =>
        initMessenger.call('PredictDeviceAuthService:signRead', proposed),
      invalidateSigningSession: () =>
        initMessenger.call('PredictDeviceAuthService:invalidateA2t'),
    }),
  );
  return {
    controller: new PredictPortfolioService({
      messenger: controllerMessenger,
      portfolio: adapter.portfolio,
      venueId: adapter.venueId,
    }),
  };
};

export const predictOrderServiceInit: MessengerClientInitFunction<
  PredictOrderService,
  PredictOrderServiceMessenger,
  PredictOrderServiceInitMessenger
> = ({ controllerMessenger, initMessenger, getState }) => {
  // Trading-capable composition lives here, at the Engine composition root —
  // product modules never import concrete adapters (see venue-adapters.md).
  // Quote and Commit requests are single-flight workflow calls that must
  // bypass the shared query cache, so they get their own client instead of
  // the Engine-registered data services' cached reads.
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: process.env.MM_PREDICT_API_URL,
      clientVersion: packageJSON.version,
      getBearerToken: () =>
        initMessenger.call('AuthenticationController:getBearerToken'),
      // The Commit is a device-signed call: without signOperation the client
      // refuses to send it (PredictRequestNotSentError) and Approve & Submit
      // always fails with the generic invalid-response error.
      signOperation: (operation, input) =>
        initMessenger.call(
          'PredictDeviceAuthService:signOperation',
          operation,
          input,
        ),
      // Receipt observation can request a signed reconciliation scan.
      signRead: (proposed) =>
        initMessenger.call('PredictDeviceAuthService:signRead', proposed),
      invalidateSigningSession: () =>
        initMessenger.call('PredictDeviceAuthService:invalidateA2t'),
    }),
    {
      getApprovalGeneration: () =>
        initMessenger.call('PredictDeviceAuthService:getApprovalGeneration'),
      previewOperation: (intent, input) =>
        initMessenger.call('PredictDeviceAuthService:previewOperation', intent, input),
    },
  );
  const controller = new PredictOrderService({
    messenger: controllerMessenger,
    trading: adapter.trading,
    venueId: adapter.venueId,
    journal: createOrderDispatchJournal(StorageWrapper),
  });
  // An Active Venue change cancels every Preview that has not crossed the
  // submission boundary. It is watched here, not on a screen, so it applies
  // whether or not the Order sheet is mounted; committed operations keep
  // being observed.
  const unsubscribeVenue = subscribeToActiveVenueChanges(
    { getState, subscribe: (listener) => store.subscribe(listener) },
    () => controller.cancelUncommittedPreviews(),
  );
  let recoverySignedIn = initMessenger.call('AuthenticationController:getState').isSignedIn;
  const cleanupRecovery = bindOrderRecoveryLifecycle({
    service: controller,
    isUnlocked: () => initMessenger.call('KeyringController:getState').isUnlocked,
    isSignedIn: () => initMessenger.call('AuthenticationController:getState').isSignedIn,
    isEnabled: () => resolveVenueAuthProfile(parsePredictConfig(
      getState().engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.predictConfig,
    )) !== undefined,
    getIdentityScope: async () => {
      const profile = await initMessenger.call('AuthenticationController:getSessionProfile');
      return profile.canonicalProfileId || undefined;
    },
    subscribeSession: (listener) => {
      const changed = () => listener();
      const authenticationChanged = () => {
        const signedIn = initMessenger.call('AuthenticationController:getState').isSignedIn;
        if (signedIn !== recoverySignedIn) {
          recoverySignedIn = signedIn;
          controller.suspendRecovery();
          listener();
        }
      };
      const profileChanged = () => {
        controller.suspendRecovery();
        listener();
      };
      initMessenger.subscribe('KeyringController:lock', changed);
      initMessenger.subscribe('KeyringController:unlock', changed);
      initMessenger.subscribe('AuthenticationController:stateChange', authenticationChanged);
      initMessenger.subscribe('AuthenticationController:profileSignIn', profileChanged);
      initMessenger.subscribe('RemoteFeatureFlagController:stateChange', changed);
      return () => {
        initMessenger.unsubscribe('KeyringController:lock', changed);
        initMessenger.unsubscribe('KeyringController:unlock', changed);
        initMessenger.unsubscribe('AuthenticationController:stateChange', authenticationChanged);
        initMessenger.unsubscribe('AuthenticationController:profileSignIn', profileChanged);
        initMessenger.unsubscribe('RemoteFeatureFlagController:stateChange', changed);
      };
    },
  });
  controller.setLifecycleCleanup(() => {
    unsubscribeVenue();
    cleanupRecovery();
  });
  return { controller };
};
