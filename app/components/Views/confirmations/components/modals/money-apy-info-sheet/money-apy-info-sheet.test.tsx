import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { MoneyDepositApySheet } from './money-apy-info-sheet';
import { MoneyDepositApySheetTestIds } from './money-apy-info-sheet.testIds';

describe('MoneyDepositApySheet', () => {
  it('renders nothing when closed', () => {
    const { queryByTestId } = render(
      <MoneyDepositApySheet open={false} onClose={jest.fn()} apy={6.2} />,
    );

    expect(queryByTestId(MoneyDepositApySheetTestIds.CONTAINER)).toBeNull();
  });

  it('renders live APY headline and redesigned sections with exact copy when open', () => {
    const { getByTestId, getByText } = render(
      <MoneyDepositApySheet open onClose={jest.fn()} apy={6.2} />,
    );

    expect(
      getByTestId(MoneyDepositApySheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyDepositApySheetTestIds.SCROLL_VIEW),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyDepositApySheetTestIds.APY_TITLE),
    ).toHaveTextContent('6.2% APY');
    expect(
      getByText(strings('confirm.money_deposit.apy_info_sheet.subtitle')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        'This is the rate your MetaMask Money balance is earning right now.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        'Earnings are added to your balance in real time and compound, so your earnings earn too.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Why it changes')).toBeOnTheScreen();
    expect(
      getByText(
        "APY is variable and isn't guaranteed. It moves up and down with borrowing demand.",
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        'Your funds go into a DeFi vault that lends across established markets. Veda manages the vault, and Steakhouse Financial oversees its risk.',
      ),
    ).toBeOnTheScreen();
  });

  it('omits the APY headline when APY is unavailable', () => {
    const { queryByTestId, getByText } = render(
      <MoneyDepositApySheet open onClose={jest.fn()} apy={undefined} />,
    );

    expect(queryByTestId(MoneyDepositApySheetTestIds.APY_TITLE)).toBeNull();
    expect(
      getByText(strings('confirm.money_deposit.apy_info_sheet.subtitle')),
    ).toBeOnTheScreen();
  });
});
