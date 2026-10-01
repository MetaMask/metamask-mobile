import React from 'react';
import { render } from '@testing-library/react-native';
import MembershipBanner, { formatMembershipDueDate } from './MembershipBanner';
import { ProHubTestIds } from '../../ProHub.testIds';
import {
  MEMBERSHIP_BANNER_STATES,
  MembershipBannerKind,
  MOCK_PRO_HUB_STATS,
} from '../../ProHub.constants';
import { strings } from '../../../../../../locales/i18n';

const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const renderMembershipBanner = (
  kind: (typeof MembershipBannerKind)[keyof typeof MembershipBannerKind],
) =>
  render(
    <MembershipBanner
      state={MEMBERSHIP_BANNER_STATES[kind]}
      addFundsDueDate={MOCK_PRO_HUB_STATS.addFundsDueDate}
      onAction={jest.fn()}
    />,
  );

describe('MembershipBanner', () => {
  it('renders overdue payment failed copy and danger icon', () => {
    const { getByTestId } = renderMembershipBanner(
      MembershipBannerKind.Overdue,
    );

    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_LABEL),
    ).toHaveTextContent(strings('pro_hub.membership_status.overdue'));
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_BANNER),
    ).toHaveTextContent(
      toRegex(strings('pro_hub.membership_alert.payment_failed.title')),
    );
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_BANNER),
    ).toHaveTextContent(
      toRegex(strings('pro_hub.membership_alert.payment_failed.description')),
    );
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION),
    ).toHaveTextContent(
      strings('pro_hub.membership_alert.payment_failed.action'),
    );
  });

  it('renders deactivated inactive copy and danger icon', () => {
    const { getByTestId } = renderMembershipBanner(
      MembershipBannerKind.Deactivated,
    );

    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_LABEL),
    ).toHaveTextContent(strings('pro_hub.membership_status.deactivated'));
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_BANNER),
    ).toHaveTextContent(
      toRegex(strings('pro_hub.membership_alert.inactive.title')),
    );
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION),
    ).toHaveTextContent(strings('pro_hub.membership_alert.inactive.action'));
  });

  it('renders active renewal failed copy and warning icon', () => {
    const { getByTestId } = renderMembershipBanner(
      MembershipBannerKind.ActiveRenewalFailed,
    );

    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_LABEL),
    ).toHaveTextContent(strings('pro_hub.membership_status.active'));
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_BANNER),
    ).toHaveTextContent(
      toRegex(strings('pro_hub.membership_alert.renewal_failed.title')),
    );
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION),
    ).toHaveTextContent(
      strings('pro_hub.membership_alert.renewal_failed.action'),
    );
  });

  it('renders cancelled copy with renew-by date and warning severity', () => {
    const { getByTestId } = renderMembershipBanner(
      MembershipBannerKind.Cancelled,
    );

    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_LABEL),
    ).toHaveTextContent(strings('pro_hub.membership_status.cancelled'));
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_BANNER),
    ).toHaveTextContent(
      toRegex(strings('pro_hub.membership_alert.cancelled.title')),
    );
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_BANNER),
    ).toHaveTextContent(
      toRegex(
        strings('pro_hub.membership_alert.cancelled.description', {
          date: formatMembershipDueDate(MOCK_PRO_HUB_STATS.addFundsDueDate),
        }),
      ),
    );
    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_ALERT_ACTION),
    ).toHaveTextContent(strings('pro_hub.membership_alert.cancelled.action'));
  });
});

describe('formatMembershipDueDate', () => {
  it('formats an ISO date as MM/DD/YYYY', () => {
    expect(formatMembershipDueDate('2026-10-12')).toBe('10/12/2026');
  });

  it('returns the original string when the date cannot be parsed', () => {
    expect(formatMembershipDueDate('not-a-date')).toBe('not-a-date');
  });
});
