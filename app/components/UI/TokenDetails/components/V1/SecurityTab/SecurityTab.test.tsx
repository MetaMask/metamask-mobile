import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import en from '../../../../../../../locales/languages/en.json';
import {
  MOCK_SECURITY_FACTS_EVM,
  MOCK_SECURITY_FACTS_SOLANA,
} from '../../../mocks/tokenDetailsV1Mocks';
import { TokenExplainerSheetSelectors } from '../TokenExplainerSheet/TokenExplainerSheet.testIds';
import SecurityTab from './SecurityTab';
import {
  SECURITY_CHECKS_BY_NAMESPACE,
  SECURITY_EXPLAINER_KEYS,
} from './SecurityTab.constants';
import { SecurityTabSelectors } from './SecurityTab.testIds';
import {
  SecurityCheckKey,
  SecurityStatKey,
  SupportedSecurityNamespace,
  type SecurityRowKey,
} from './SecurityTab.types';

const ALL_ROW_KEYS: SecurityRowKey[] = [
  ...Object.values(SecurityCheckKey),
  ...Object.values(SecurityStatKey),
];

describe('SecurityTab', () => {
  it('renders every section for a chain with complete data', () => {
    const { getByTestId } = render(
      <SecurityTab facts={MOCK_SECURITY_FACTS_EVM} onExplain={jest.fn()} />,
    );

    for (const section of [
      SecurityTabSelectors.SECTION_CHECKS,
      SecurityTabSelectors.SECTION_HOLDERS,
      SecurityTabSelectors.SECTION_LIQUIDITY,
      SecurityTabSelectors.SECTION_TRADING,
      SecurityTabSelectors.SECTION_ORIGIN,
      SecurityTabSelectors.SCAN_META,
      SecurityTabSelectors.DISCLAIMER,
    ]) {
      expect(getByTestId(section)).toBeOnTheScreen();
    }
  });

  // Blockaid returns every `fees` field as null on Solana, so keeping the
  // section would leave a heading above two dashes rather than information.
  it('omits the trading section when the chain has no fee data', () => {
    const { queryByTestId } = render(
      <SecurityTab facts={MOCK_SECURITY_FACTS_SOLANA} onExplain={jest.fn()} />,
    );

    expect(queryByTestId(SecurityTabSelectors.SECTION_TRADING)).toBeNull();
  });

  describe('check selection', () => {
    it.each([
      [SupportedSecurityNamespace.Eip155, MOCK_SECURITY_FACTS_EVM],
      [SupportedSecurityNamespace.Solana, MOCK_SECURITY_FACTS_SOLANA],
    ] as const)('renders only the %s checks', (namespace, facts) => {
      const expected = SECURITY_CHECKS_BY_NAMESPACE[namespace];
      const { getByTestId, queryByTestId } = render(
        <SecurityTab facts={facts} onExplain={jest.fn()} />,
      );

      for (const checkKey of Object.values(SecurityCheckKey)) {
        const row = queryByTestId(SecurityTabSelectors.row(checkKey));

        if (expected.includes(checkKey)) {
          expect(
            getByTestId(SecurityTabSelectors.row(checkKey)),
          ).toBeOnTheScreen();
        } else {
          expect(row).toBeNull();
        }
      }
    });

    // The two namespaces must not accidentally converge on the same list —
    // that would mean a Solana token showing Ethereum's honeypot and renounced
    // checks, which the ticket forbids outright.
    it('gives the two chain families different checks', () => {
      expect(
        SECURITY_CHECKS_BY_NAMESPACE[SupportedSecurityNamespace.Solana],
      ).not.toEqual(
        SECURITY_CHECKS_BY_NAMESPACE[SupportedSecurityNamespace.Eip155],
      );
      expect(
        SECURITY_CHECKS_BY_NAMESPACE[SupportedSecurityNamespace.Solana],
      ).not.toContain(SecurityCheckKey.NoHoneypot);
      expect(
        SECURITY_CHECKS_BY_NAMESPACE[SupportedSecurityNamespace.Solana],
      ).not.toContain(SecurityCheckKey.ContractVerified);
    });
  });

  describe('explainers', () => {
    // The tab reports the tap rather than rendering the sheet itself: the
    // design system `BottomSheet` positions against its nearest positioned
    // ancestor, so a sheet mounted in here would be clipped by the page
    // ScrollView and scroll away with the content.
    it.each([
      ['a stat row', SecurityStatKey.TopTen],
      ['a check row', SecurityCheckKey.NoHoneypot],
    ] as const)('reports the tapped row for %s', (_label, rowKey) => {
      const onExplain = jest.fn();
      const { getByTestId } = render(
        <SecurityTab facts={MOCK_SECURITY_FACTS_EVM} onExplain={onExplain} />,
      );

      fireEvent.press(getByTestId(SecurityTabSelectors.rowLabel(rowKey)));

      expect(onExplain).toHaveBeenCalledWith(rowKey);
    });

    it('renders no sheet of its own', () => {
      const { queryByTestId } = render(
        <SecurityTab facts={MOCK_SECURITY_FACTS_EVM} onExplain={jest.fn()} />,
      );

      expect(queryByTestId(TokenExplainerSheetSelectors.SHEET)).toBeNull();
    });

    // A `Record` over every row key guarantees an entry exists, but not that
    // the entry points at a real translation. Without this, a typo in a key
    // path would render the path itself on device.
    it.each(ALL_ROW_KEYS)('has resolvable copy for %s', (rowKey) => {
      const { title, description } = SECURITY_EXPLAINER_KEYS[rowKey];

      for (const key of [title, description]) {
        const resolved = strings(key);

        expect(resolved).not.toBe('');
        // An unresolved key comes back as `[missing "en.<key>" translation]`,
        // so matching the wrapper is enough — and is specific enough not to
        // trip on copy that legitimately uses the word "missing".
        expect(resolved).not.toMatch(/\[missing/iu);
        expect(resolved).not.toContain(key);
      }
    });
  });

  // The G22 wording rule bans these outright, and the explainer copy is prose
  // — the likeliest place for one to slip back in during a copy review.
  it('uses none of the banned verdict wordings', () => {
    const banned = [
      'Pass',
      'Fully screened',
      'No risk',
      'Partial screen',
      'Low risk',
      'Medium risk',
      'Verified',
    ];
    const copy = JSON.stringify(en.token_details_v1.security_tab);

    for (const phrase of banned) {
      expect(copy).not.toContain(phrase);
    }
  });

  it('shows the same verdict word as the hero pill', () => {
    const { getByTestId } = render(
      <SecurityTab facts={MOCK_SECURITY_FACTS_EVM} onExplain={jest.fn()} />,
    );

    expect(getByTestId(SecurityTabSelectors.VERDICT)).toHaveTextContent(
      strings('token_details_v1.security_pill.screened'),
    );
  });

  it('names the flag that fired instead of summarising a pass ratio', () => {
    const { getByTestId } = render(
      <SecurityTab
        facts={{
          ...MOCK_SECURITY_FACTS_EVM,
          verdict: 'high_risk',
          highRiskFlag: 'The blacklist function is included',
        }}
        onExplain={jest.fn()}
      />,
    );

    expect(getByTestId(SecurityTabSelectors.HIGH_RISK_FLAG)).toHaveTextContent(
      'The blacklist function is included',
    );
  });

  it('shows no flag line for verdicts that carry no named flag', () => {
    const { queryByTestId } = render(
      <SecurityTab facts={MOCK_SECURITY_FACTS_EVM} onExplain={jest.fn()} />,
    );

    expect(queryByTestId(SecurityTabSelectors.HIGH_RISK_FLAG)).toBeNull();
  });

  // The prototype shows the same two figures twice over: once in the bar's
  // legend and again as tappable rows. Only the rows carry the definitions, so
  // dropping either half loses something.
  it('shows the holders figures in both the legend and the rows', () => {
    const { getByTestId } = render(
      <SecurityTab facts={MOCK_SECURITY_FACTS_EVM} onExplain={jest.fn()} />,
    );

    expect(getByTestId(SecurityTabSelectors.LEGEND_TOP_TEN)).toHaveTextContent(
      'Top 10 18.4%',
    );
    expect(
      getByTestId(SecurityTabSelectors.rowValue(SecurityStatKey.TopTen)),
    ).toHaveTextContent('18.4%');
  });

  it('orders the holders rows as the prototype does', () => {
    const { getByTestId } = render(
      <SecurityTab facts={MOCK_SECURITY_FACTS_EVM} onExplain={jest.fn()} />,
    );

    const renderedOrder = within(
      getByTestId(SecurityTabSelectors.SECTION_HOLDERS),
    )
      .getAllByTestId(/-row-[a-z_]+$/)
      .map((row) => row.props.testID);

    expect(renderedOrder).toStrictEqual([
      SecurityTabSelectors.row(SecurityStatKey.Holders),
      SecurityTabSelectors.row(SecurityStatKey.TopTen),
    ]);
  });
});
