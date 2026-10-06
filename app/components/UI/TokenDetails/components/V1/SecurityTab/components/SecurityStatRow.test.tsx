import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SECURITY_EMPTY_VALUE } from '../SecurityTab.constants';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import { SecurityStatKey } from '../SecurityTab.types';
import SecurityStatRow from './SecurityStatRow';

describe('SecurityStatRow', () => {
  it('renders the formatted value', () => {
    const { getByTestId } = render(
      <SecurityStatRow
        statKey={SecurityStatKey.TotalLiquidity}
        value="$560.0K"
        onExplain={jest.fn()}
      />,
    );

    expect(
      getByTestId(
        SecurityTabSelectors.rowValue(SecurityStatKey.TotalLiquidity),
      ),
    ).toHaveTextContent('$560.0K');
  });

  it('renders a dash when the value is missing', () => {
    const { getByTestId } = render(
      <SecurityStatRow
        statKey={SecurityStatKey.PrimaryPool}
        value={null}
        onExplain={jest.fn()}
      />,
    );

    expect(
      getByTestId(SecurityTabSelectors.rowValue(SecurityStatKey.PrimaryPool)),
    ).toHaveTextContent(SECURITY_EMPTY_VALUE);
  });

  // The whole reason the row takes `string | null` rather than a raw number is
  // that `0` is falsy: a `value || dash` implementation would turn a token with
  // genuinely no tax into "we don't know", which is the opposite claim.
  it.each(['0%', '0% / 0%', '0'])(
    'renders a real zero rather than a dash: %s',
    (value) => {
      const { getByTestId } = render(
        <SecurityStatRow
          statKey={SecurityStatKey.BuySellTax}
          value={value}
          onExplain={jest.fn()}
        />,
      );

      const node = getByTestId(
        SecurityTabSelectors.rowValue(SecurityStatKey.BuySellTax),
      );

      expect(node).toHaveTextContent(value);
      expect(node).not.toHaveTextContent(SECURITY_EMPTY_VALUE);
    },
  );

  it('asks for the explainer when the label is tapped', () => {
    const onExplain = jest.fn();
    const { getByTestId } = render(
      <SecurityStatRow
        statKey={SecurityStatKey.Holders}
        value="12.9K"
        onExplain={onExplain}
      />,
    );

    fireEvent.press(
      getByTestId(SecurityTabSelectors.rowLabel(SecurityStatKey.Holders)),
    );

    expect(onExplain).toHaveBeenCalledWith(SecurityStatKey.Holders);
  });

  it('labels the row with its localized name', () => {
    const { getByText } = render(
      <SecurityStatRow
        statKey={SecurityStatKey.LiquidityToMarketCap}
        value="4.52%"
        onExplain={jest.fn()}
      />,
    );

    expect(getByText('Liq/MC')).toBeOnTheScreen();
  });
});
