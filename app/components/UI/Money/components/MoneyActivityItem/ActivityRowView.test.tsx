import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { MoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import { MoneyActivityItemTestIds } from './MoneyActivityItem.testIds';
import ActivityRowView from './ActivityRowView';

const display: MoneyTransactionDisplayInfo = {
  label: 'Deposited',
  description: 'Bank transfer',
  primaryAmount: '+12.35 mUSD',
  fiatAmount: '+$12.35',
  isIncoming: true,
  icon: IconName.Add,
  status: 'confirmed',
  showPrimaryAmount: true,
};

describe('ActivityRowView', () => {
  it('renders a completed deposit row and forwards its row id on press', () => {
    const onPress = jest.fn();
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityRowView
        id="vba-deposit-1"
        display={display}
        onPress={onPress}
      />,
    );

    fireEvent.press(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-vba-deposit-1`),
    );

    expect(getByTestId(MoneyActivityItemTestIds.LABEL)).toHaveTextContent(
      'Deposited',
    );
    expect(getByTestId(MoneyActivityItemTestIds.DESCRIPTION)).toHaveTextContent(
      'Bank transfer',
    );
    expect(
      getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('+12.35 mUSD');
    expect(getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toHaveTextContent(
      '+$12.35',
    );
    const icon = getByTestId(MoneyActivityItemTestIds.ICON);

    if ('iconName' in icon.props) {
      expect(icon).toHaveProp('iconName', IconName.Add);
    }
    expect(icon).toHaveProp('accessibilityLabel', IconName.Add);
    expect(
      queryByTestId(MoneyActivityItemTestIds.PENDING_SPINNER, {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledWith('vba-deposit-1');
  });

  it('masks both completed deposit amounts when privacy mode is enabled', () => {
    const { getByTestId } = renderWithProvider(
      <ActivityRowView id="vba-deposit-2" display={display} privacyMode />,
    );

    expect(
      getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('•'.repeat(6));
    expect(getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toHaveTextContent(
      '•'.repeat(6),
    );
  });
});
