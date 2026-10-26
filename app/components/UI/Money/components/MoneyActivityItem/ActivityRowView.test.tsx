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

  it('renders a dimmed pending amount with a pending status label', () => {
    const pendingDisplay: MoneyTransactionDisplayInfo = {
      ...display,
      primaryAmount: '+1,000.00 mUSD',
      fiatAmount: '',
      status: 'pending',
      pendingStatusLabel: 'Pending',
      isPrimaryAmountPending: true,
    };
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityRowView id="vba-deposit-pending" display={pendingDisplay} />,
    );

    expect(
      getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('+1,000.00 mUSD');
    expect(
      getByTestId(MoneyActivityItemTestIds.PENDING_STATUS),
    ).toHaveTextContent('Pending');
    expect(queryByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toBeNull();
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

  it('renders only the fiat amount when the primary line is not requested', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityRowView
        id="received-1"
        display={{ ...display, showPrimaryAmount: undefined }}
      />,
    );

    expect(
      queryByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).not.toBeOnTheScreen();
    expect(getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT)).toHaveTextContent(
      '+$12.35',
    );
  });

  it('hides an empty fiat line when the primary amount is shown', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityRowView
        id="card-purchase-1"
        display={{
          ...display,
          label: 'Purchase',
          description: 'Coffee Shop',
          primaryAmount: '-$10.00',
          fiatAmount: '',
          isIncoming: false,
          icon: IconName.Card,
          showPrimaryAmount: true,
        }}
      />,
    );

    expect(
      getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('-$10.00');
    expect(
      queryByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
    ).not.toBeOnTheScreen();
  });

  it('masks only the primary amount when the fiat line is empty', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityRowView
        id="card-purchase-2"
        display={{
          ...display,
          primaryAmount: '-$10.00',
          fiatAmount: '',
          showPrimaryAmount: true,
        }}
        privacyMode
      />,
    );

    expect(
      getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('•'.repeat(6));
    expect(
      queryByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
    ).not.toBeOnTheScreen();
  });
});
