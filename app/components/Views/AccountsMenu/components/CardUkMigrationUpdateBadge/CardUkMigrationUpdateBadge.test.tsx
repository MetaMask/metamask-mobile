import React from 'react';
import { render } from '@testing-library/react-native';
import CardUkMigrationUpdateBadge from './CardUkMigrationUpdateBadge';
import { CardUkMigrationUpdateBadgeSelectors } from './CardUkMigrationUpdateBadge.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) =>
    key === 'accounts_menu.card_update_badge' ? 'Update' : key,
}));

describe('CardUkMigrationUpdateBadge', () => {
  it.each(['info', 'warning', 'danger'] as const)(
    'renders Update label for %s severity',
    (severity) => {
      const { getByTestId, getByText } = render(
        <CardUkMigrationUpdateBadge severity={severity} />,
      );

      expect(
        getByTestId(CardUkMigrationUpdateBadgeSelectors.BADGE),
      ).toBeOnTheScreen();
      expect(getByText('Update')).toBeOnTheScreen();
    },
  );
});
