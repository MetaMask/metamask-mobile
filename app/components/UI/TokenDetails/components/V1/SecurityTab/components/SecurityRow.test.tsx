import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconColor, IconName } from '@metamask/design-system-react-native';
import { SECURITY_EMPTY_VALUE } from '../SecurityTab.constants';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import { SecurityCheckKey, SecurityStatKey } from '../SecurityTab.types';
import SecurityRow from './SecurityRow';

const PASS_ICON = {
  name: IconName.CheckBold,
  color: IconColor.SuccessDefault,
} as const;

describe('SecurityRow', () => {
  it('renders the formatted value', () => {
    const { getByTestId } = render(
      <SecurityRow
        rowKey={SecurityStatKey.TotalLiquidity}
        label="Total liquidity"
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
      <SecurityRow
        rowKey={SecurityStatKey.PrimaryPool}
        label="Primary pool"
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
        <SecurityRow
          rowKey={SecurityStatKey.BuySellTax}
          label="Buy/sell tax"
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

  it('renders the label text it is given', () => {
    const { getByText } = render(
      <SecurityRow
        rowKey={SecurityStatKey.LiquidityToMarketCap}
        label="Liq/MC"
        value="4.52%"
        onExplain={jest.fn()}
      />,
    );

    expect(getByText('Liq/MC')).toBeOnTheScreen();
  });

  it('reports the row that was tapped', () => {
    const onExplain = jest.fn();
    const { getByTestId } = render(
      <SecurityRow
        rowKey={SecurityStatKey.Holders}
        label="Holders"
        value="12.9K"
        onExplain={onExplain}
      />,
    );

    fireEvent.press(
      getByTestId(SecurityTabSelectors.rowLabel(SecurityStatKey.Holders)),
    );

    expect(onExplain).toHaveBeenCalledWith(SecurityStatKey.Holders);
  });

  // The dotted underline is the only visual hint that the label is tappable,
  // and a screen reader cannot see it — so the accessibility label has to say
  // what the gesture does rather than just repeat the row name.
  it('announces the label as a button that explains the term', () => {
    const { getByLabelText } = render(
      <SecurityRow
        rowKey={SecurityStatKey.PrimaryPool}
        label="Primary pool"
        value={null}
        onExplain={jest.fn()}
      />,
    );

    expect(getByLabelText('What does Primary pool mean?')).toBeOnTheScreen();
  });

  describe('glyph', () => {
    it('draws the glyph it is given', () => {
      const { getByTestId } = render(
        <SecurityRow
          rowKey={SecurityCheckKey.NoHoneypot}
          label="No honeypot"
          value="Sells work"
          icon={PASS_ICON}
          onExplain={jest.fn()}
        />,
      );

      expect(
        getByTestId(SecurityTabSelectors.rowIcon(SecurityCheckKey.NoHoneypot)),
      ).toBeOnTheScreen();
    });

    it('draws no glyph when none is given', () => {
      const { queryByTestId } = render(
        <SecurityRow
          rowKey={SecurityStatKey.Holders}
          label="Holders"
          value="12.9K"
          onExplain={jest.fn()}
        />,
      );

      expect(
        queryByTestId(SecurityTabSelectors.rowIcon(SecurityStatKey.Holders)),
      ).toBeNull();
    });

    // A glyph beside a dash would assert an outcome for a row that has none,
    // so the missing value wins over whatever the caller passed.
    it('suppresses the glyph when the value is missing', () => {
      const { getByTestId, queryByTestId } = render(
        <SecurityRow
          rowKey={SecurityCheckKey.NoBlacklist}
          label="No blacklist"
          value={null}
          icon={PASS_ICON}
          onExplain={jest.fn()}
        />,
      );

      expect(
        getByTestId(
          SecurityTabSelectors.rowValue(SecurityCheckKey.NoBlacklist),
        ),
      ).toHaveTextContent(SECURITY_EMPTY_VALUE);
      expect(
        queryByTestId(
          SecurityTabSelectors.rowIcon(SecurityCheckKey.NoBlacklist),
        ),
      ).toBeNull();
    });
  });
});
