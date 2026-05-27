import React from 'react';
import { Pressable } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  MoneyAccountDepositTooltipModal,
  useMoneyAccountDepositTooltip,
} from './useMoneyAccountDepositTooltip';
import { strings } from '../../../../../locales/i18n';
import useMoneyAccountBalance from './useMoneyAccountBalance';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  ),
}));

jest.mock('./useMoneyAccountBalance');

const mockStrings = strings as jest.MockedFunction<typeof strings>;
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;

const TEST_ID = 'money-account-deposit-tooltip';
const APY_PERCENT = 4;

describe('useMoneyAccountDepositTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountBalance.mockReturnValue({
      apyPercent: APY_PERCENT,
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);
  });

  it('interpolates the Money Account APY percentage into the title and description', () => {
    render(
      <MoneyAccountDepositTooltipModal
        open
        setOpen={jest.fn()}
        tooltipTestId={TEST_ID}
      />,
    );

    expect(mockStrings).toHaveBeenCalledWith('money.deposit_tooltip_title', {
      percentage: APY_PERCENT,
    });
    expect(mockStrings).toHaveBeenCalledWith(
      'money.deposit_tooltip_description',
      { percentage: APY_PERCENT },
    );
  });

  it('does not call useMoneyAccountBalance while the modal is closed', () => {
    const { queryByText } = render(
      <MoneyAccountDepositTooltipModal
        open={false}
        setOpen={jest.fn()}
        tooltipTestId={TEST_ID}
      />,
    );

    expect(mockUseMoneyAccountBalance).not.toHaveBeenCalled();
    expect(queryByText(/money\.deposit_tooltip_title/)).toBeNull();
  });

  it('onInfoPress opens the tooltip and the close button closes it', () => {
    const Harness = () => {
      const { TooltipNode, onInfoPress } =
        useMoneyAccountDepositTooltip(TEST_ID);
      return (
        <>
          <Pressable testID="open-trigger" onPress={onInfoPress} />
          {TooltipNode}
        </>
      );
    };

    const { getByTestId, queryByText } = render(<Harness />);

    const expectedTitle = `money.deposit_tooltip_title:${JSON.stringify({
      percentage: APY_PERCENT,
    })}`;

    expect(queryByText(expectedTitle)).toBeNull();

    fireEvent.press(getByTestId('open-trigger'));
    expect(queryByText(expectedTitle)).not.toBeNull();

    fireEvent.press(getByTestId(`${TEST_ID}-close-btn`));
    expect(queryByText(expectedTitle)).toBeNull();
  });
});
