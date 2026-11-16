import '../mocks';
import Engine from '../../../app/core/Engine';
import ReduxService, { type ReduxStore } from '../../../app/core/redux';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from '../../../app/components/UI/Money/components/MoneyVbaHomeCard/MoneyVbaHomeCard.testIds';
import { renderMoneyHomeVbaCard } from './moneyHome';

/**
 * `ReduxService` has no way to clear a store, so the baseline is a sentinel
 * installed before the tests. The renderer must put that sentinel back.
 * KYC state starts unset on the component-view Engine mock.
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
  beforeAll(() => {
    ReduxService.store = sentinelStore;
  });

  afterAll(() => {
    expectMoneyHomeGlobalsAtBaseline();
  });

  it('publishes the retry session on the live controller for the render', async () => {
    expectMoneyHomeGlobalsAtBaseline();

    const { findByTestId } = renderMoneyHomeVbaCard('retry');

    expect(
      await findByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_retry.CONTAINER),
    ).toBeOnTheScreen();
    expect(kycController.state?.sessionStatus?.finalStatus).toBe('retry');
    expect(kycController.state?.sessionStatus?.id).toBe('session-1');
    expect(ReduxService.store).not.toBe(sentinelStore);
  });

  it('returns the controller and store to the baseline without a caller afterEach', () => {
    expectMoneyHomeGlobalsAtBaseline();
  });
});
