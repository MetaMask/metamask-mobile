import React from 'react';
import { render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import AlsoIncludedRow from './AlsoIncludedRow';
import { AlsoIncludedRowTestIds } from './AlsoIncludedRow.testIds';
import type { AlsoIncludedItem } from '../../ProHub.constants';
import { strings } from '../../../../../../locales/i18n';

const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const itemWithBadge: AlsoIncludedItem = {
  id: 'transaction_protection',
  iconName: IconName.SecurityTick,
  titleKey: 'pro_hub.also_included.transaction_protection.title',
  subtitleKey: 'pro_hub.also_included.transaction_protection.subtitle',
  badgeKey: 'pro_hub.also_included.transaction_protection.badge',
};

const itemWithoutBadge: AlsoIncludedItem = {
  id: 'priority_support',
  iconName: IconName.Call,
  titleKey: 'pro_hub.also_included.priority_support.title',
  subtitleKey: 'pro_hub.also_included.priority_support.subtitle',
};

describe('AlsoIncludedRow', () => {
  it('renders the title, subtitle, and badge when provided', () => {
    const { getByTestId } = render(<AlsoIncludedRow item={itemWithBadge} />);

    const row = getByTestId(
      AlsoIncludedRowTestIds.ROW(itemWithBadge.id),
    );

    expect(row).toHaveTextContent(toRegex(strings(itemWithBadge.titleKey)));
    expect(row).toHaveTextContent(
      toRegex(strings(itemWithBadge.subtitleKey)),
    );
    expect(row).toHaveTextContent(
      toRegex(strings(itemWithBadge.badgeKey as string)),
    );
  });

  it('renders the title and subtitle without a badge', () => {
    const { getByTestId } = render(
      <AlsoIncludedRow item={itemWithoutBadge} />,
    );

    const row = getByTestId(
      AlsoIncludedRowTestIds.ROW(itemWithoutBadge.id),
    );

    expect(row).toHaveTextContent(
      toRegex(strings(itemWithoutBadge.titleKey)),
    );
    expect(row).toHaveTextContent(
      toRegex(strings(itemWithoutBadge.subtitleKey)),
    );
  });

  it('does not set accessibilityRole button', () => {
    const { getByTestId } = render(<AlsoIncludedRow item={itemWithBadge} />);

    const row = getByTestId(
      AlsoIncludedRowTestIds.ROW(itemWithBadge.id),
    );

    expect(row.props.accessibilityRole).not.toBe('button');
  });
});
