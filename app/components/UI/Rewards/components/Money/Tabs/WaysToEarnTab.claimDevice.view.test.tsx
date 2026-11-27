/**
 * Claim gaps from the Rewards Money test plan.
 *
 * G17: once the missing account is on this phone, the earned-elsewhere caption
 * clears, Claim enables, and the claim opens — on the already-mounted screen.
 * RWDS-1731: a rebate-only user never sees the tax flow; a user with other
 * rewards does.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/WaysToEarnTab.claimDevice.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { setEarningsSummary } from '../../../../../../reducers/rewardsMoney';
import { selectCommissionMechanisms } from '../../../../../../reducers/rewardsMoney/selectors';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../ClaimableRewardsCard.testIds';
import { TAX_FORM_QUESTION_SHEET_TEST_IDS } from '../TaxFormQuestionSheet.testIds';
import { TAX_FORM_OPEN_FORM_SHEET_TEST_IDS } from '../TaxFormOpenFormSheet.testIds';
import { REWARDS_INFO_SHEET_MODAL_TEST_IDS } from '../../RewardsInfoSheetModal';
import { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab.testIds';
import { renderWaysToEarnTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  earningsSummaryFixture,
  REWARDS_MONEY_PROFILE_ID,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';

function callsFor(engine: jest.Mock, action: string): unknown[][] {
  return engine.mock.calls.filter((call) => call[0] === action);
}

const ON_DEVICE = '0x1111111111111111111111111111111111111111';
const ELSEWHERE = '0x3333333333333333333333333333333333333333';
const ONE_DOLLAR = '1000000';
const EARNED_ELSEWHERE_COPY =
  'Some earnings belong to accounts not on this device. Import the wallet to claim.';

const TAX_ATTESTATION_UNCLEARED = {
  state: 'ACTION_REQUIRED' as const,
  next_action: 'ANSWER_ATTESTATION' as const,
  reason: 'NO_ATTESTATION',
  clears_until: null,
  cleared: false,
  can_change_answer: false,
};

/** $1 of cashback on one address, no other reward family. */
function rebateOnlySummary(cashbackAddress: string) {
  const summary = earningsSummaryFixture({
    lifetimeTotal: ONE_DOLLAR,
    claimable: ONE_DOLLAR,
    cashbackClaimable: ONE_DOLLAR,
  });
  summary.self_earned.by_claim_family.REFERRAL_TRADE_FEE_CASHBACK.by_address = [
    {
      address: `eip155:${cashbackAddress}`,
      lifetime: ONE_DOLLAR,
      claimable: ONE_DOLLAR,
      pending: '0',
      claimed: '0',
      voided: '0',
    },
  ];
  return summary;
}

function installDeviceKeyring(address: string) {
  const keyrings = Engine.context.KeyringController.state.keyrings as {
    type: string;
    accounts: string[];
  }[];
  keyrings.push({ type: 'HD Key Tree', accounts: [address] });
  return () => {
    keyrings.length = 0;
  };
}

describe('WaysToEarnTab claim device gaps', () => {
  beforeEach(() => {
    (Engine.context.KeyringController.state.keyrings as unknown[]).length = 0;
  });

  it('clears the earned-elsewhere caption and claims once the account is added (G17)', async () => {
    const summary = rebateOnlySummary(ELSEWHERE);
    const { getByText, getByTestId, queryByText, store, engine } =
      renderWaysToEarnTab({
        persona: 'referee',
        summary,
        claimReady: true,
        initiateClaim: 'hang',
      });

    // Before the account exists here, the caption explains why Claim is off.
    // The caption and the card are on the first render: the summary is seeded
    // in Redux, so no await is needed before the state change below.
    expect(getByText(EARNED_ELSEWHERE_COPY)).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeDisabled();

    const restore = installDeviceKeyring(ELSEWHERE);
    try {
      // An import refreshes the account list; the mounted tab re-runs the
      // sign check on the same summary. A summary dispatch is what the real
      // refresh lands as, so replay it instead of remounting.
      await act(async () => {
        store.dispatch(
          setEarningsSummary({
            profileId: REWARDS_MONEY_PROFILE_ID,
            data: summary,
          }),
        );
      });

      expect(queryByText(EARNED_ELSEWHERE_COPY)).not.toBeOnTheScreen();
      const claimButton = getByTestId(
        CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON,
      );
      expect(claimButton).toBeEnabled();

      fireEvent.press(claimButton);

      await waitFor(() => {
        expect(
          callsFor(engine, 'RewardsMoneyController:initiateClaim'),
        ).toEqual([
          [
            'RewardsMoneyController:initiateClaim',
            'referral-trade-fee-cashback',
            { money_account_address: expect.any(String) },
          ],
        ]);
      });
    } finally {
      restore();
    }
  });

  it('claims a rebate-only balance without opening the tax flow (RWDS-1731)', async () => {
    const restore = installDeviceKeyring(ON_DEVICE);
    try {
      const { findByTestId, queryByTestId, engine } = renderWaysToEarnTab({
        persona: 'referee',
        summary: rebateOnlySummary(ON_DEVICE),
        claimReady: true,
        initiateClaim: 'hang',
        handlers: {
          'RewardsMoneyController:getTaxMe': async () =>
            Promise.resolve(TAX_ATTESTATION_UNCLEARED),
        },
      });

      fireEvent.press(
        await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
      );

      await waitFor(() => {
        expect(
          callsFor(engine, 'RewardsMoneyController:initiateClaim').map(
            (call) => call[1],
          ),
        ).toEqual(['referral-trade-fee-cashback']);
      });
      expect(
        queryByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.TITLE),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(REWARDS_INFO_SHEET_MODAL_TEST_IDS.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(WAYS_TO_EARN_TAB_TEST_IDS.SUMMARY_ERROR),
      ).not.toBeOnTheScreen();
    } finally {
      restore();
    }
  });

  it('opens the tax flow for the same user once other rewards are claimable (RWDS-1731)', async () => {
    const summary = earningsSummaryFixture({
      claimable: ONE_DOLLAR,
      cashbackClaimable: '0',
      followTradeClaimable: ONE_DOLLAR,
    });
    const { findByTestId, queryByTestId, store, engine } = renderWaysToEarnTab({
      persona: 'referee',
      summary,
      claimReady: true,
      initiateClaim: 'hang',
      handlers: {
        'RewardsMoneyController:getTaxMe': async () =>
          Promise.resolve(TAX_ATTESTATION_UNCLEARED),
        'RewardsMoneyController:getCommissions': async () =>
          Promise.resolve({
            results: [],
            mechanisms: {
              REFERRAL_REV_SHARE: {
                claim_open: false,
                reason: 'MECHANISM_NOT_CLAIMABLE',
              },
              SOCIAL_FOLLOW_TRADE: { claim_open: true, reason: null },
            },
            has_more: false,
            cursor: null,
          }),
      },
    });

    // The follow-trade route opens when the commissions read lands. Press
    // only once that mechanism is in Redux, so the press sees the route.
    await waitFor(() => {
      expect(
        selectCommissionMechanisms(store.getState(), REWARDS_MONEY_PROFILE_ID)
          ?.SOCIAL_FOLLOW_TRADE?.claim_open,
      ).toBe(true);
    });

    fireEvent.press(
      await findByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    );

    expect(
      await findByTestId(TAX_FORM_QUESTION_SHEET_TEST_IDS.TITLE),
    ).toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:initiateClaim'),
    ).toHaveLength(0);
  });
});
