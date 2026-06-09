import { expectSaga } from 'redux-saga-test-plan';
import { call } from 'redux-saga-test-plan/matchers';
import { CLEAR_ONBOARDING } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { clearAttribution } from '../../core/redux/slices/attribution';
import ReduxService from '../../core/redux';
import { persistAttributionFromPendingDeeplink } from '../../util/analytics/persistAttributionFromPendingDeeplink';
import {
  watchMarketingAttributionOnClearOnboarding,
  watchMarketingAttributionOnConsentChange,
} from './marketingAttribution';

jest.mock('../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
    },
  },
}));

jest.mock('../../util/analytics/persistAttributionFromPendingDeeplink', () => ({
  persistAttributionFromPendingDeeplink: jest.fn(),
}));

describe('marketingAttribution sagas', () => {
  const mockDispatch = ReduxService.store.dispatch as jest.Mock;

  describe('watchMarketingAttributionOnConsentChange', () => {
    it('puts clearAttribution when marketing data collection is disabled', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .dispatch(setDataCollectionForMarketing(false))
        .put(clearAttribution())
        .silentRun(50);
    });

    it('backfills attribution from pending deeplink when marketing data collection is enabled', async () => {
      await expectSaga(watchMarketingAttributionOnConsentChange)
        .provide([[call.fn(persistAttributionFromPendingDeeplink), true]])
        .dispatch(setDataCollectionForMarketing(true))
        .call(persistAttributionFromPendingDeeplink, mockDispatch)
        .not.put(clearAttribution())
        .silentRun(50);
    });
  });

  describe('watchMarketingAttributionOnClearOnboarding', () => {
    it('puts clearAttribution when onboarding is cleared', async () => {
      await expectSaga(watchMarketingAttributionOnClearOnboarding)
        .dispatch({ type: CLEAR_ONBOARDING })
        .put(clearAttribution())
        .silentRun(50);
    });
  });
});
