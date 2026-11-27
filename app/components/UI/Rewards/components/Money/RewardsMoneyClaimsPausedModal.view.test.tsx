/**
 * Claims paused sheet and balance breakdown through the Rewards Money preset.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/RewardsMoneyClaimsPausedModal.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import {
  CLAIMS_PAUSED_JOURNEY_TEST_IDS,
  renderRewardsMoneyClaimsPausedModal,
} from '../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../../tests/component-view/presets/rewardsMoney';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS as TEST_IDS,
  type RewardsMoneyClaimsPausedModalParams,
} from './RewardsMoneyClaimsPausedModal';

const TERMS_DESCRIPTION = REFERRAL_LOCALIZED_TEXT.termsDescription;
const TERMS_LEARN_MORE = REFERRAL_LOCALIZED_TEXT.termsLearnMore;
const TERMS_URL = REFERRAL_LOCALIZED_TEXT.termsUrl;
const GOT_IT = strings('rewards.upcoming_rewards.cta_label');

const TOTALS = {
  lifetime_total: '132000000',
  claimable: '0',
  held: '100000000',
  blocked: '12000000',
  voided: '6000000',
  pending: '4000000',
  claimed: '10000000',
};

const {
  breakdown: BREAKDOWN,
  totalEarningsLabel: RECORDED_EARNINGS,
  availableToClaim: AVAILABLE_TO_CLAIM,
  held: HELD,
  blocked: BLOCKED,
  voided: VOIDED,
  pending: PENDING,
  claimed: CLAIMED,
  claimsPausedTitle: PAUSED_TITLE,
  claimsPausedDescription: PAUSED_DESCRIPTION,
} = REFERRAL_LOCALIZED_TEXT;

// Same mapping EarningsTab passes in: the recorded earnings row is labelled
// with totalEarningsLabel.
const LABELS = {
  breakdown: BREAKDOWN,
  recordedEarningsLabel: RECORDED_EARNINGS,
  availableToClaim: AVAILABLE_TO_CLAIM,
  held: HELD,
  blocked: BLOCKED,
  voided: VOIDED,
  pending: PENDING,
  claimed: CLAIMED,
};

const PAUSED_PARAMS: RewardsMoneyClaimsPausedModalParams = {
  title: PAUSED_TITLE,
  description: PAUSED_DESCRIPTION,
  totals: TOTALS,
  labels: LABELS,
};

const BREAKDOWN_PARAMS: RewardsMoneyClaimsPausedModalParams = {
  variant: 'breakdown',
  title: BREAKDOWN,
  totals: TOTALS,
  labels: LABELS,
};

function withTermsCopy(overrides: Partial<ReferralLocalizedText>) {
  return {
    referralMe: {
      ...referralMeFixture('referee'),
      localized_text: { ...REFERRAL_LOCALIZED_TEXT, ...overrides },
    },
  };
}

function renderedTestIds(node: unknown): string[] {
  if (!node || typeof node === 'string') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap(renderedTestIds);
  }
  if (typeof node !== 'object') {
    return [];
  }
  const record = node as {
    props?: { testID?: unknown };
    children?: unknown[] | null;
  };
  const own =
    typeof record.props?.testID === 'string' ? [record.props.testID] : [];
  return [...own, ...(record.children ?? []).flatMap(renderedTestIds)];
}

describe('RewardsMoneyClaimsPausedModal', () => {
  it('shows the pause explanation, every balance row, the terms copy and Learn more', async () => {
    const { findByTestId, getByTestId, getByText, queryByText } =
      renderRewardsMoneyClaimsPausedModal(PAUSED_PARAMS);

    expect(await findByTestId(TEST_IDS.TITLE)).toHaveTextContent(PAUSED_TITLE);
    expect(getByTestId(TEST_IDS.DESCRIPTION)).toHaveTextContent(
      PAUSED_DESCRIPTION,
    );
    expect(getByTestId(TEST_IDS.BREAKDOWN_HEADER)).toHaveTextContent(BREAKDOWN);
    expect(getByText(RECORDED_EARNINGS)).toBeOnTheScreen();
    expect(getByText('$132.00')).toBeOnTheScreen();
    expect(getByText(AVAILABLE_TO_CLAIM)).toBeOnTheScreen();
    expect(getByText('$0.00')).toBeOnTheScreen();
    expect(getByText(HELD)).toBeOnTheScreen();
    expect(getByText('$100.00')).toBeOnTheScreen();
    expect(getByText(BLOCKED)).toBeOnTheScreen();
    expect(getByText('$12.00')).toBeOnTheScreen();
    expect(getByText(VOIDED)).toBeOnTheScreen();
    expect(getByText('$6.00')).toBeOnTheScreen();
    expect(getByText(PENDING)).toBeOnTheScreen();
    expect(getByText('$4.00')).toBeOnTheScreen();
    expect(getByText(CLAIMED)).toBeOnTheScreen();
    expect(getByText('$10.00')).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.TERMS_DIVIDER)).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.TERMS_DESCRIPTION)).toHaveTextContent(
      TERMS_DESCRIPTION,
    );
    expect(getByText(TERMS_LEARN_MORE)).toBeOnTheScreen();
    expect(queryByText(GOT_IT)).not.toBeOnTheScreen();
  });

  it('shows the balance rows and Learn more on the breakdown without the pause explanation', async () => {
    const { findByTestId, getByTestId, getByText, queryByTestId, queryByText } =
      renderRewardsMoneyClaimsPausedModal(BREAKDOWN_PARAMS);

    expect(await findByTestId(TEST_IDS.TITLE)).toHaveTextContent(BREAKDOWN);
    expect(queryByTestId(TEST_IDS.DESCRIPTION)).not.toBeOnTheScreen();
    expect(queryByTestId(TEST_IDS.DIVIDER)).not.toBeOnTheScreen();
    expect(queryByTestId(TEST_IDS.BREAKDOWN_HEADER)).not.toBeOnTheScreen();
    expect(getByText(RECORDED_EARNINGS)).toBeOnTheScreen();
    expect(getByText('$132.00')).toBeOnTheScreen();
    expect(getByText(HELD)).toBeOnTheScreen();
    expect(getByText('$100.00')).toBeOnTheScreen();
    expect(getByTestId(TEST_IDS.TERMS_DESCRIPTION)).toHaveTextContent(
      TERMS_DESCRIPTION,
    );
    expect(getByText(TERMS_LEARN_MORE)).toBeOnTheScreen();
    expect(queryByText(GOT_IT)).not.toBeOnTheScreen();
  });

  it('hides zero Held, Blocked and Voided rows and keeps Available to claim and Pending', async () => {
    const { findByTestId, getByTestId, getByText, queryByTestId, queryByText } =
      renderRewardsMoneyClaimsPausedModal({
        ...PAUSED_PARAMS,
        totals: { ...TOTALS, held: '0', blocked: '0', voided: '0' },
      });

    expect(
      await findByTestId(`${TEST_IDS.TOTALS}-claimable`),
    ).toBeOnTheScreen();
    expect(queryByTestId(`${TEST_IDS.TOTALS}-held`)).not.toBeOnTheScreen();
    expect(queryByTestId(`${TEST_IDS.TOTALS}-blocked`)).not.toBeOnTheScreen();
    expect(queryByTestId(`${TEST_IDS.TOTALS}-voided`)).not.toBeOnTheScreen();
    expect(queryByText(HELD)).not.toBeOnTheScreen();
    expect(queryByText(BLOCKED)).not.toBeOnTheScreen();
    expect(queryByText(VOIDED)).not.toBeOnTheScreen();
    expect(getByText(AVAILABLE_TO_CLAIM)).toBeOnTheScreen();
    expect(getByText('$0.00')).toBeOnTheScreen();
    expect(getByTestId(`${TEST_IDS.TOTALS}-pending`)).toBeOnTheScreen();
    expect(getByTestId(`${TEST_IDS.TOTALS}-claimed`)).toBeOnTheScreen();
  });

  it('lists Pending before Held and the terms description after Claimed', async () => {
    const { findByTestId, toJSON } =
      renderRewardsMoneyClaimsPausedModal(PAUSED_PARAMS);

    await findByTestId(TEST_IDS.TERMS_DESCRIPTION);

    const ids = renderedTestIds(toJSON());
    const pendingIndex = ids.indexOf(`${TEST_IDS.TOTALS}-pending`);
    const heldIndex = ids.indexOf(`${TEST_IDS.TOTALS}-held`);
    const claimedIndex = ids.indexOf(`${TEST_IDS.TOTALS}-claimed`);
    const termsIndex = ids.indexOf(TEST_IDS.TERMS_DESCRIPTION);
    expect(pendingIndex).toBeGreaterThanOrEqual(0);
    expect(heldIndex).toBeGreaterThan(pendingIndex);
    expect(termsIndex).toBeGreaterThan(claimedIndex);
  });

  it('hides the terms divider and description when the terms copy is empty but keeps Learn more', async () => {
    const { findByText, queryByTestId } = renderRewardsMoneyClaimsPausedModal(
      PAUSED_PARAMS,
      withTermsCopy({ termsDescription: '' }),
    );

    expect(await findByText(TERMS_LEARN_MORE)).toBeOnTheScreen();
    expect(queryByTestId(TEST_IDS.TERMS_DIVIDER)).not.toBeOnTheScreen();
    expect(queryByTestId(TEST_IDS.TERMS_DESCRIPTION)).not.toBeOnTheScreen();
  });

  it('opens the terms URL in the in-app browser when Learn more is pressed', async () => {
    const { findByTestId } = renderRewardsMoneyClaimsPausedModal(PAUSED_PARAMS);

    fireEvent.press(await findByTestId(TEST_IDS.TERMS));

    const browserProbe = await findByTestId(
      getRouteParamsProbeTestId(Routes.BROWSER.HOME),
    );
    expect(JSON.parse(String(browserProbe.props.children))).toEqual({
      newTabUrl: TERMS_URL,
      timestamp: expect.any(Number),
    });
  });

  it.each([
    ['paused sheet', PAUSED_PARAMS],
    ['breakdown', BREAKDOWN_PARAMS],
  ])(
    'shows Got it and the terms description instead of Learn more on the %s when there is no terms URL, and closing returns to the screen below',
    async (_variant, params) => {
      const { findByTestId, getByTestId, queryByTestId, queryByText } =
        renderRewardsMoneyClaimsPausedModal(
          params,
          withTermsCopy({ termsUrl: '   ' }),
        );

      const gotIt = await findByTestId(TEST_IDS.GOT_IT);
      expect(queryByTestId(TEST_IDS.TERMS)).not.toBeOnTheScreen();
      expect(queryByText(TERMS_LEARN_MORE)).not.toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.TERMS_DESCRIPTION)).toHaveTextContent(
        TERMS_DESCRIPTION,
      );

      fireEvent.press(gotIt);

      await waitFor(() => {
        expect(
          getByTestId(CLAIMS_PAUSED_JOURNEY_TEST_IDS.HOST),
        ).toBeOnTheScreen();
      });
    },
  );
});
