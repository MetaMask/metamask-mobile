import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  earningsSummaryFixture,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../../tests/component-view/presets/rewardsMoney';
import { strings } from '../../../../../../locales/i18n';
import type { SummarySectionState } from './Tabs/earningsSummarySection';
import EarnFamilyEarningsSection from './EarnFamilyEarningsSection';
import { EARN_FAMILY_EARNINGS_TEST_IDS } from './EarnFamilyEarningsSection.testIds';

const LOCALIZED_TEXT = REFERRAL_LOCALIZED_TEXT;

const loaded = (
  data: SummarySectionState['data'] = earningsSummaryFixture({
    cashbackBlocked: '2000000',
  }),
): SummarySectionState => ({
  data,
  loading: false,
  refreshing: false,
  failed: false,
  error: false,
  show: true,
});

const rowTestId = (key: string) =>
  `${EARN_FAMILY_EARNINGS_TEST_IDS.ROW}-${key}`;

describe('EarnFamilyEarningsSection', () => {
  it('lists claimable, pending and claimed in that order, then blocked when above zero', () => {
    const { getByTestId, queryByTestId } = render(
      <EarnFamilyEarningsSection
        localizedText={LOCALIZED_TEXT}
        summary={loaded()}
        branch="self_earned"
        family="REFERRAL_TRADE_FEE_CASHBACK"
        onRetry={jest.fn()}
      />,
    );

    expect(getByTestId(rowTestId('claimable'))).toBeOnTheScreen();
    expect(getByTestId(rowTestId('pending'))).toBeOnTheScreen();
    expect(getByTestId(rowTestId('claimed'))).toBeOnTheScreen();
    expect(getByTestId(rowTestId('blocked'))).toBeOnTheScreen();
    expect(queryByTestId(rowTestId('held'))).toBeNull();
    expect(queryByTestId(rowTestId('voided'))).toBeNull();
  });

  it('hides blocked, held and voided when they are zero', () => {
    const { queryByTestId } = render(
      <EarnFamilyEarningsSection
        localizedText={LOCALIZED_TEXT}
        summary={loaded(earningsSummaryFixture())}
        branch="self_earned"
        family="REFERRAL_TRADE_FEE_CASHBACK"
        onRetry={jest.fn()}
      />,
    );

    expect(queryByTestId(rowTestId('blocked'))).toBeNull();
    expect(queryByTestId(rowTestId('held'))).toBeNull();
    expect(queryByTestId(rowTestId('voided'))).toBeNull();
  });

  it('shows extra rows after the amounts', () => {
    const { getByTestId } = render(
      <EarnFamilyEarningsSection
        localizedText={LOCALIZED_TEXT}
        summary={loaded()}
        branch="earned_by_others"
        family="REFERRAL_REV_SHARE"
        extraRows={[{ key: 'confirmed', label: 'Confirmed', value: '7' }]}
        onRetry={jest.fn()}
      />,
    );

    expect(getByTestId(rowTestId('confirmed'))).toBeOnTheScreen();
  });

  it('shows a skeleton while the summary loads', () => {
    const { getByTestId, queryByTestId } = render(
      <EarnFamilyEarningsSection
        localizedText={LOCALIZED_TEXT}
        summary={{ ...loaded(null), loading: true }}
        branch="self_earned"
        family="REFERRAL_TRADE_FEE_CASHBACK"
        onRetry={jest.fn()}
      />,
    );

    expect(
      getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
    expect(queryByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('keeps the amounts and retries the summary from the banner below them', () => {
    const onRetry = jest.fn();
    const { getByTestId, getByText } = render(
      <EarnFamilyEarningsSection
        localizedText={LOCALIZED_TEXT}
        summary={{ ...loaded(null), failed: true, error: true }}
        branch="self_earned"
        family="REFERRAL_TRADE_FEE_CASHBACK"
        onRetry={onRetry}
      />,
    );

    expect(getByTestId(rowTestId('claimable'))).toHaveTextContent('—', {
      exact: false,
    });
    expect(getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.ERROR)).toHaveTextContent(
      strings('rewards.earnings_summary_error.error_fetching_title'),
      { exact: false },
    );
    fireEvent.press(
      getByText(strings('rewards.earnings_summary_error.retry_button')),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the funnel banner when only the funnel failed', () => {
    const onRetryFunnel = jest.fn();
    const { getByTestId, getByText } = render(
      <EarnFamilyEarningsSection
        localizedText={LOCALIZED_TEXT}
        summary={loaded()}
        branch="earned_by_others"
        family="REFERRAL_REV_SHARE"
        funnelFailed
        onRetry={jest.fn()}
        onRetryFunnel={onRetryFunnel}
      />,
    );

    expect(getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.ERROR)).toHaveTextContent(
      strings('rewards.referral_details_error.error_fetching_title'),
      { exact: false },
    );
    fireEvent.press(
      getByText(strings('rewards.referral_details_error.retry_button')),
    );

    expect(onRetryFunnel).toHaveBeenCalledTimes(1);
  });

  it('keeps the summary banner when the funnel failed too', () => {
    const { getByTestId, queryByText } = render(
      <EarnFamilyEarningsSection
        localizedText={LOCALIZED_TEXT}
        summary={{ ...loaded(null), failed: true, error: true }}
        branch="earned_by_others"
        family="REFERRAL_REV_SHARE"
        funnelFailed
        onRetry={jest.fn()}
        onRetryFunnel={jest.fn()}
      />,
    );

    expect(getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.ERROR)).toHaveTextContent(
      strings('rewards.earnings_summary_error.error_fetching_title'),
      { exact: false },
    );
    expect(
      queryByText(
        strings('rewards.referral_details_error.error_fetching_title'),
      ),
    ).toBeNull();
  });
});
