import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SECURITY_EMPTY_VALUE } from '../SecurityTab.constants';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import { SecurityCheckKey } from '../SecurityTab.types';
import SecurityCheckRow from './SecurityCheckRow';

describe('SecurityCheckRow', () => {
  it('renders a passing check with its glyph and wording', () => {
    const { getByTestId } = render(
      <SecurityCheckRow
        checkKey={SecurityCheckKey.NoHoneypot}
        check={{ outcome: 'pass', value: 'Sells work' }}
        onExplain={jest.fn()}
      />,
    );

    expect(
      getByTestId(SecurityTabSelectors.rowValue(SecurityCheckKey.NoHoneypot)),
    ).toHaveTextContent('Sells work');
    expect(
      getByTestId(SecurityTabSelectors.rowIcon(SecurityCheckKey.NoHoneypot)),
    ).toBeOnTheScreen();
  });

  it('renders a failing check with its glyph and wording', () => {
    const { getByTestId } = render(
      <SecurityCheckRow
        checkKey={SecurityCheckKey.Renounced}
        check={{ outcome: 'fail', value: 'Not renounced' }}
        onExplain={jest.fn()}
      />,
    );

    expect(
      getByTestId(SecurityTabSelectors.rowValue(SecurityCheckKey.Renounced)),
    ).toHaveTextContent('Not renounced');
    expect(
      getByTestId(SecurityTabSelectors.rowIcon(SecurityCheckKey.Renounced)),
    ).toBeOnTheScreen();
  });

  // Blockaid reports the risks it detected, never the checks it ran, so a tick
  // on an unresolved check would assert a test result the API never returned.
  // Both the absent-check and the explicit-unknown routes have to land on a
  // bare dash.
  it.each([
    ['an absent check', undefined],
    ['an explicitly unknown check', { outcome: 'unknown', value: null }],
    [
      'an unknown check that still carries a value',
      {
        outcome: 'unknown',
        value: 'Clean',
      },
    ],
  ] as const)('shows a dash and no glyph for %s', (_description, check) => {
    const { getByTestId, queryByTestId } = render(
      <SecurityCheckRow
        checkKey={SecurityCheckKey.NoBlacklist}
        check={check}
        onExplain={jest.fn()}
      />,
    );

    expect(
      getByTestId(SecurityTabSelectors.rowValue(SecurityCheckKey.NoBlacklist)),
    ).toHaveTextContent(SECURITY_EMPTY_VALUE);
    expect(
      queryByTestId(SecurityTabSelectors.rowIcon(SecurityCheckKey.NoBlacklist)),
    ).toBeNull();
  });

  it('asks for the explainer when the label is tapped', () => {
    const onExplain = jest.fn();
    const { getByTestId } = render(
      <SecurityCheckRow
        checkKey={SecurityCheckKey.ContractVerified}
        check={{ outcome: 'pass', value: 'Yes' }}
        onExplain={onExplain}
      />,
    );

    fireEvent.press(
      getByTestId(
        SecurityTabSelectors.rowLabel(SecurityCheckKey.ContractVerified),
      ),
    );

    expect(onExplain).toHaveBeenCalledWith(SecurityCheckKey.ContractVerified);
  });
});
