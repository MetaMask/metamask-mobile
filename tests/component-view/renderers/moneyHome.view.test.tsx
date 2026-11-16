import '../mocks';
import { waitFor } from '@testing-library/react-native';
import Engine from '../../../app/core/Engine';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../../app/components/UI/Money/components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';
import { renderMoneyHomeVbaCard, restoreMoneyHomeTestState } from './moneyHome';

/**
 * `ReduxService` has no way to clear a store, so each test installs a sentinel
 * before it renders. The sentinel only covers restoring a store that already
 * existed. KYC state starts unset on the component-view Engine mock.
 */
const sentinelStore = {
  dispatch: () => ({ type: 'money-home-renderer-cleanup-sentinel' }),
  getState: () => ({}),
} as unknown as ReduxStore;

interface KycControllerWithState {
  state?: {
    sessionStatus?: {
      finalStatus?: string;
      id?: string;
    };
  };
}

const kycController = Engine.context
  .KycController as unknown as KycControllerWithState;

const defaultKycState = kycController.state;

const expectMoneyHomeGlobalsAtBaseline = (): void => {
  expect(kycController.state).toBe(defaultKycState);
  expect(ReduxService.store).toBe(sentinelStore);
};

describe('moneyHome renderer cleanup', () => {
  beforeEach(() => {
    restoreMoneyHomeTestState();
    ReduxService.store = sentinelStore;
  });

  it('restores the store and KYC session after the retry card renders', async () => {
    expectMoneyHomeGlobalsAtBaseline();

    const { getByTestId } = renderMoneyHomeVbaCard('retry');

    await waitFor(() => {
      expect(
        getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CONTAINER),
      ).toBeOnTheScreen();
    });
    expect(kycController.state?.sessionStatus?.finalStatus).toBe('retry');
    expect(kycController.state?.sessionStatus?.id).toBe('session-1');
    expect(ReduxService.store).not.toBe(sentinelStore);

    restoreMoneyHomeTestState();

    expectMoneyHomeGlobalsAtBaseline();

    const restoredKycState = kycController.state;
    const restoredStore = ReduxService.store;
    restoreMoneyHomeTestState();
    expect(kycController.state).toBe(restoredKycState);
    expect(ReduxService.store).toBe(restoredStore);
  });
});
