import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import StatExplainerSheet from './StatExplainerSheet';
import { STAT_EXPLAINER_KEYS } from './StatBar.constants';
import { StatExplainerSheetSelectors } from './StatBar.testIds';
import { TokenStatKey } from './StatBar.types';

const ALL_STAT_KEYS = Object.values(TokenStatKey);

describe('StatExplainerSheet', () => {
  it('renders the copy for the stat it is given', () => {
    const { getByTestId } = render(
      <StatExplainerSheet statKey={TokenStatKey.Top10} onClose={jest.fn()} />,
    );

    expect(getByTestId(StatExplainerSheetSelectors.TITLE)).toHaveTextContent(
      'Top 10 holders',
    );
    expect(
      getByTestId(StatExplainerSheetSelectors.DESCRIPTION),
    ).toHaveTextContent(
      'Share held by the top 10 wallets, excluding pools, routers, and burn addresses.',
    );
  });

  it('closes when the button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <StatExplainerSheet statKey={TokenStatKey.MarketCap} onClose={onClose} />,
    );

    fireEvent.press(getByTestId(StatExplainerSheetSelectors.GOT_IT_BUTTON));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // `STAT_EXPLAINER_KEYS` being a `Record<TokenStatKey, ...>` guarantees an
  // entry exists, but not that the entry points at a real translation. Without
  // this, a typo in a key path would render the path itself on device.
  it.each(ALL_STAT_KEYS)('has resolvable copy for %s', (statKey) => {
    const { title, description } = STAT_EXPLAINER_KEYS[statKey];

    for (const key of [title, description]) {
      const resolved = strings(key);

      expect(resolved).not.toBe('');
      expect(resolved).not.toContain(key);
      expect(resolved.toLowerCase()).not.toContain('missing');
    }
  });

  it('uses a distinct title from the abbreviated bar label where they differ', () => {
    // The sheet spells the name out; the bar abbreviates to fit the cell. A
    // regression that reused the label would show "MCap" as the sheet heading.
    expect(strings(STAT_EXPLAINER_KEYS[TokenStatKey.MarketCap].title)).toBe(
      'Market capitalization',
    );
    expect(strings('token_details_v1.stats.market_cap')).toBe('MCap');
  });
});
