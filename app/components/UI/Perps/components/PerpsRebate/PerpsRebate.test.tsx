import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsRebateSelectorsIDs } from '../../Perps.testIds';
import {
  formatPerpsRebatePercentage,
  getDisplayablePerpsRebateBips,
  PerpsRebateFooterText,
  PerpsRebateRow,
} from './PerpsRebate';

describe('PerpsRebateRow', () => {
  it('renders an eligible rebate percentage', () => {
    render(<PerpsRebateRow rebateBips={500} />);

    expect(screen.getByTestId(PerpsRebateSelectorsIDs.ROW)).toBeOnTheScreen();
    expect(screen.getByTestId(PerpsRebateSelectorsIDs.VALUE)).toHaveTextContent(
      strings('perps.rebate.back', { percentage: '5' }),
    );
  });

  it('renders nothing for a zero rebate', () => {
    render(<PerpsRebateRow rebateBips={0} />);

    expect(
      screen.queryByTestId(PerpsRebateSelectorsIDs.ROW),
    ).not.toBeOnTheScreen();
  });

  it('opens rebate information from the row', () => {
    const onInfoPress = jest.fn();
    render(<PerpsRebateRow rebateBips={500} onInfoPress={onInfoPress} />);

    fireEvent.press(screen.getByTestId(PerpsRebateSelectorsIDs.INFO_BUTTON));

    expect(onInfoPress).toHaveBeenCalledTimes(1);
  });
});

describe('PerpsRebateFooterText', () => {
  it('appends the rebate treatment to fee text', () => {
    render(
      <PerpsRebateFooterText
        feeText={strings('perps.trade_sheet.includes_fee', {
          feePercentage: '0.143',
        })}
        rebateBips={500}
      />,
    );

    expect(
      screen.getByTestId(PerpsRebateSelectorsIDs.FOOTER),
    ).toHaveTextContent('Includes 0.143% fee • 5% rebate earned');
  });

  it('renders only fee text without an eligible rebate', () => {
    const feeText = strings('perps.trade_sheet.includes_fee', {
      feePercentage: '0.143',
    });
    render(<PerpsRebateFooterText feeText={feeText} />);

    expect(
      screen.getByTestId(PerpsRebateSelectorsIDs.FOOTER),
    ).toHaveTextContent(feeText);
  });

  it('opens rebate information from the footer treatment', () => {
    const onInfoPress = jest.fn();
    render(
      <PerpsRebateFooterText
        feeText="Includes 0.143% fee"
        rebateBips={500}
        onInfoPress={onInfoPress}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsRebateSelectorsIDs.FOOTER_INFO_BUTTON),
    );

    expect(onInfoPress).toHaveBeenCalledTimes(1);
  });
});

describe('rebate formatting', () => {
  it('formats basis points with at most two decimal places', () => {
    const percentage = formatPerpsRebatePercentage(1_255);

    expect(percentage).toBe('12.55');
  });

  it('returns rebate bips only for eligible positive quotes', () => {
    const eligible = getDisplayablePerpsRebateBips(true, 500);
    const ineligible = getDisplayablePerpsRebateBips(false, 500);

    expect(eligible).toBe(500);
    expect(ineligible).toBeUndefined();
  });
});
