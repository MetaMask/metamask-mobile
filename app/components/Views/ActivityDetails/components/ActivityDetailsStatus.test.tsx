import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import type { Status } from '../../../../util/activity-adapters';
import { ActivityDetailsStatus } from './ActivityDetailsStatus';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

describe('ActivityDetailsStatus', () => {
  it.each<[Status, string]>([
    ['success', strings('transaction.confirmed')],
    ['pending', strings('transaction.pending')],
    ['failed', strings('transaction.failed')],
    ['cancelled', strings('transaction.cancelled')],
  ])('renders the %s status label', (status, label) => {
    const { getByText, getByTestId } = renderWithProvider(
      <ActivityDetailsStatus status={status} />,
    );

    expect(getByText(label)).toBeOnTheScreen();
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_PILL),
    ).toBeOnTheScreen();
  });
});
