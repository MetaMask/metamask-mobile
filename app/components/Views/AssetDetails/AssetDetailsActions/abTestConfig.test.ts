import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import { AB_TEST_ANALYTICS_MAPPINGS } from '../../../../util/analytics/abTestAnalyticsRegistry';
import {
  WALLET_HOME_HEADER_ACTIONS_AB_KEY,
  WALLET_HOME_HEADER_ACTIONS_AB_TEST_ANALYTICS_MAPPING,
  WALLET_HOME_HEADER_ACTIONS_VARIANTS,
  WalletHomeHeaderActionsVariant,
} from './abTestConfig';

describe('wallet home header actions abTestConfig', () => {
  it('follows the {team}{TICKET}Abtest{TestName} naming convention', () => {
    expect(WALLET_HOME_HEADER_ACTIONS_AB_KEY).toBe(
      'homeTMCU0AbtestHeaderActionsBuySell',
    );
    expect(WALLET_HOME_HEADER_ACTIONS_AB_KEY).toMatch(
      /^[a-z][A-Za-z0-9]*[A-Z]{2,}[0-9]+Abtest[A-Z][A-Za-z0-9]*$/,
    );
  });

  it('defaults the missing-flag path to the current Buy Swap Send Receive row', () => {
    expect(
      WALLET_HOME_HEADER_ACTIONS_VARIANTS[
        WalletHomeHeaderActionsVariant.Control
      ],
    ).toEqual({ showBuySellSendReceive: false });
    expect(
      WALLET_HOME_HEADER_ACTIONS_VARIANTS[
        WalletHomeHeaderActionsVariant.Treatment
      ],
    ).toEqual({ showBuySellSendReceive: true });
  });

  it('registers home and action-button events for active_ab_tests enrichment', () => {
    expect(WALLET_HOME_HEADER_ACTIONS_AB_TEST_ANALYTICS_MAPPING).toEqual({
      flagKey: WALLET_HOME_HEADER_ACTIONS_AB_KEY,
      validVariants: Object.values(WalletHomeHeaderActionsVariant),
      eventNames: [EVENT_NAME.HOME_VIEWED, EVENT_NAME.ACTION_BUTTON_CLICKED],
    });
    expect(AB_TEST_ANALYTICS_MAPPINGS).toContain(
      WALLET_HOME_HEADER_ACTIONS_AB_TEST_ANALYTICS_MAPPING,
    );
  });
});
