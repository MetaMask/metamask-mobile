import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconColor, IconName } from '@metamask/design-system-react-native';
import {
  STAT_EMPTY_VALUE,
  TokenStatKey,
} from '../../../../constants/tokenStats';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import { ContractCheckKey } from '../SecurityTab.types';
import SecurityRow from './SecurityRow';

const PASS_ICON = {
  name: IconName.CheckBold,
  color: IconColor.SuccessDefault,
} as const;

describe('SecurityRow', () => {
  it('renders the formatted value', () => {
    const { getByTestId } = render(
      <SecurityRow
        rowKey={TokenStatKey.Liquidity}
        label="Total liquidity"
        value="$560.0K"
        onExplain={jest.fn()}
      />,
    );

    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Liquidity)),
    ).toHaveTextContent('$560.0K');
  });

  it('renders a dash when the value is missing', () => {
    const { getByTestId } = render(
      <SecurityRow
        rowKey={TokenStatKey.PrimaryPool}
        label="Primary pool"
        value={null}
        onExplain={jest.fn()}
      />,
    );

    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.PrimaryPool)),
    ).toHaveTextContent(STAT_EMPTY_VALUE);
  });

  // The whole reason the row takes `string | null` rather than a raw number is
  // that `0` is falsy: a `value || dash` implementation would turn a token with
  // genuinely no tax into "we don't know", which is the opposite claim.
  it.each(['0%', '0% / 0%', '0'])(
    'renders a real zero rather than a dash: %s',
    (value) => {
      const { getByTestId } = render(
        <SecurityRow
          rowKey={TokenStatKey.Tax}
          label="Buy/sell tax"
          value={value}
          onExplain={jest.fn()}
        />,
      );

      const node = getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Tax));

      expect(node).toHaveTextContent(value);
      expect(node).not.toHaveTextContent(STAT_EMPTY_VALUE);
    },
  );

  it('renders the label text it is given', () => {
    const { getByText } = render(
      <SecurityRow
        rowKey={TokenStatKey.LiquidityToMarketCap}
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
        rowKey={TokenStatKey.Holders}
        label="Holders"
        value="12.9K"
        onExplain={onExplain}
      />,
    );

    fireEvent.press(
      getByTestId(SecurityTabSelectors.rowLabel(TokenStatKey.Holders)),
    );

    expect(onExplain).toHaveBeenCalledWith(TokenStatKey.Holders);
  });

  // The target used to wrap the underlined label on its own, which `BodySm`
  // makes 22px tall against the 24px WCAG 2.5.8 minimum. The whole row carries
  // the press now, so a tap on the far side of the row — previously a sibling
  // of the target, with no handler above it — has to reach the same handler.
  it('reports the row when pressed away from the label', () => {
    const onExplain = jest.fn();
    const { getByTestId } = render(
      <SecurityRow
        rowKey={TokenStatKey.Holders}
        label="Holders"
        value="12.9K"
        onExplain={onExplain}
      />,
    );

    fireEvent.press(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Holders)),
    );

    expect(onExplain).toHaveBeenCalledWith(TokenStatKey.Holders);
  });

  // The dotted underline is the only visual hint that the label is tappable,
  // and a screen reader cannot see it — so the accessibility label has to say
  // what the gesture does rather than just repeat the row name.
  it('announces the label as a button that explains the term', () => {
    const { getByLabelText } = render(
      <SecurityRow
        rowKey={TokenStatKey.PrimaryPool}
        label="Primary pool"
        value={null}
        onExplain={jest.fn()}
      />,
    );

    expect(getByLabelText('What does Primary pool mean?')).toBeOnTheScreen();
  });

  // Liq/MC and Total liquidity wait on the price API while every other row is
  // already resolved, so "still fetching" and "nothing to report" have to look
  // different. Both used to render the same dash.
  describe('loading', () => {
    it('renders a skeleton instead of the dash while loading', () => {
      const { getByTestId, queryByTestId } = render(
        <SecurityRow
          rowKey={TokenStatKey.LiquidityToMarketCap}
          label="Liq/MC"
          value={null}
          isLoading
          onExplain={jest.fn()}
        />,
      );

      expect(
        getByTestId(
          SecurityTabSelectors.rowSkeleton(TokenStatKey.LiquidityToMarketCap),
        ),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(
          SecurityTabSelectors.rowValue(TokenStatKey.LiquidityToMarketCap),
        ),
      ).toBeNull();
    });

    // A value that arrived from cache has nothing to wait for, so the skeleton
    // must not replace a reading the row already has.
    it('renders the value rather than a skeleton once one arrived', () => {
      const { getByTestId, queryByTestId } = render(
        <SecurityRow
          rowKey={TokenStatKey.LiquidityToMarketCap}
          label="Liq/MC"
          value="4.52%"
          isLoading
          onExplain={jest.fn()}
        />,
      );

      expect(
        getByTestId(
          SecurityTabSelectors.rowValue(TokenStatKey.LiquidityToMarketCap),
        ),
      ).toHaveTextContent('4.52%');
      expect(
        queryByTestId(
          SecurityTabSelectors.rowSkeleton(TokenStatKey.LiquidityToMarketCap),
        ),
      ).toBeNull();
    });

    it('still reports the row when its value is a skeleton', () => {
      const onExplain = jest.fn();
      const { getByTestId } = render(
        <SecurityRow
          rowKey={TokenStatKey.Liquidity}
          label="Total liquidity"
          value={null}
          isLoading
          onExplain={onExplain}
        />,
      );

      fireEvent.press(
        getByTestId(SecurityTabSelectors.rowLabel(TokenStatKey.Liquidity)),
      );

      expect(onExplain).toHaveBeenCalledWith(TokenStatKey.Liquidity);
    });
  });

  describe('glyph', () => {
    it('draws the glyph it is given', () => {
      const { getByTestId } = render(
        <SecurityRow
          rowKey={ContractCheckKey.NoHoneypot}
          label="No honeypot"
          value="Sells work"
          icon={PASS_ICON}
          onExplain={jest.fn()}
        />,
      );

      expect(
        getByTestId(SecurityTabSelectors.rowIcon(ContractCheckKey.NoHoneypot)),
      ).toBeOnTheScreen();
    });

    it('draws no glyph when none is given', () => {
      const { queryByTestId } = render(
        <SecurityRow
          rowKey={TokenStatKey.Holders}
          label="Holders"
          value="12.9K"
          onExplain={jest.fn()}
        />,
      );

      expect(
        queryByTestId(SecurityTabSelectors.rowIcon(TokenStatKey.Holders)),
      ).toBeNull();
    });

    // A glyph beside a dash would assert an outcome for a row that has none,
    // so the missing value wins over whatever the caller passed.
    it('suppresses the glyph when the value is missing', () => {
      const { getByTestId, queryByTestId } = render(
        <SecurityRow
          rowKey={ContractCheckKey.NoBlacklist}
          label="No blacklist"
          value={null}
          icon={PASS_ICON}
          onExplain={jest.fn()}
        />,
      );

      expect(
        getByTestId(
          SecurityTabSelectors.rowValue(ContractCheckKey.NoBlacklist),
        ),
      ).toHaveTextContent(STAT_EMPTY_VALUE);
      expect(
        queryByTestId(
          SecurityTabSelectors.rowIcon(ContractCheckKey.NoBlacklist),
        ),
      ).toBeNull();
    });
  });
});
