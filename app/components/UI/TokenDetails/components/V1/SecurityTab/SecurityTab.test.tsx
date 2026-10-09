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
  SECURITY_CONTRACT_CHECKS,
  SECURITY_EMPTY_VALUE,
  SECURITY_EXPLAINER_KEYS,
} from './SecurityTab.constants';
import { SecurityTabSelectors } from './SecurityTab.testIds';
import {
  AdditionalCheckKey,
  ContractCheckKey,
  SecurityStatKey,
  type SecurityCheck,
  type SecurityRowKey,
} from './SecurityTab.types';

const ALL_ROW_KEYS: SecurityRowKey[] = [
  ...Object.values(ContractCheckKey),
  ...Object.values(SecurityStatKey),
];

const renderTab = (
  props: Partial<React.ComponentProps<typeof SecurityTab>> = {},
) =>
  render(
    <SecurityTab
      facts={MOCK_SECURITY_FACTS_EVM}
      onExplain={jest.fn()}
      onOpenContractDetails={jest.fn()}
      {...props}
    />,
  );

describe('SecurityTab', () => {
  it('renders every section for a chain with complete data', () => {
    const { getByTestId } = renderTab();

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
    const { queryByTestId } = renderTab({ facts: MOCK_SECURITY_FACTS_SOLANA });

    expect(queryByTestId(SecurityTabSelectors.SECTION_TRADING)).toBeNull();
  });

  describe('contract checks', () => {
    // An earlier revision picked a different four per chain. The list is now
    // fixed, so the same rows have to render whichever fixture is passed —
    // including the Solana one, where a check with nothing behind it falls to
    // the dash rather than disappearing.
    it.each([
      ['an EVM token', MOCK_SECURITY_FACTS_EVM],
      ['a Solana token', MOCK_SECURITY_FACTS_SOLANA],
    ] as const)('renders the same four checks for %s', (_label, facts) => {
      const { getByTestId } = renderTab({ facts });

      for (const checkKey of SECURITY_CONTRACT_CHECKS) {
        expect(
          getByTestId(SecurityTabSelectors.row(checkKey)),
        ).toBeOnTheScreen();
      }
    });

    // The additional checks live behind the chevron. Rendering them here too
    // would make the tab the long screen the detail screen exists to be.
    it('keeps the additional checks off the tab', () => {
      const { queryByTestId } = renderTab();

      for (const checkKey of Object.values(AdditionalCheckKey)) {
        expect(
          queryByTestId(`token-details-v1-security-tab-row-${checkKey}`),
        ).toBeNull();
      }
    });

    it('opens the contract security screen from the heading', () => {
      const onOpenContractDetails = jest.fn();
      const { getByTestId } = renderTab({ onOpenContractDetails });

      fireEvent.press(getByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK));

      expect(onOpenContractDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('section headings', () => {
    // Plain Text left VoiceOver and TalkBack users no way to skip between
    // sections on a tab this long (WCAG 1.3.1, 2.4.6).
    // Queried by role rather than by text: "Holders" is both a section title
    // and a row label, so matching on the word alone is ambiguous — which is
    // the ambiguity the heading role exists to resolve.
    it.each([
      en.token_details_v1.security_tab.sections.holders,
      en.token_details_v1.security_tab.sections.liquidity,
      en.token_details_v1.security_tab.sections.trading,
      en.token_details_v1.security_tab.sections.origin,
    ])('announces %s as a heading', (title) => {
      const { getByRole } = renderTab();

      expect(getByRole('header', { name: title })).toBeOnTheScreen();
    });

    // The design system bakes `px-4` into SectionHeader and concatenates
    // overrides rather than resolving them, so `px-0` wins only by arriving
    // last. If that ever stops holding, every title silently sits 16px further
    // in than the rows beneath it, and nothing else would catch it.
    it('cancels the design system inset against the tab own padding', () => {
      const { getByTestId } = renderTab();

      expect(
        getByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK),
      ).toHaveStyle({ paddingLeft: 0, paddingRight: 0 });
    });

    // Contract is the exception, because it navigates. A node cannot usefully
    // be both a heading and a button, and the action is the more useful of the
    // two to announce — so this one is asserted as a button on purpose rather
    // than left out of the list above by oversight.
    it('announces the contract heading as a button instead', () => {
      const { getByTestId } = renderTab();

      expect(
        getByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK),
      ).toHaveProp('accessibilityRole', 'button');
    });
  });

  describe('check outcomes', () => {
    const renderCheck = (check?: SecurityCheck) =>
      renderTab({
        facts: {
          ...MOCK_SECURITY_FACTS_EVM,
          checks: { [ContractCheckKey.NoHoneypot]: check },
        },
      });

    it.each([
      ['pass', 'Sells work'],
      ['fail', 'Sells blocked'],
    ] as const)(
      'shows a %s check with its glyph and wording',
      (outcome, value) => {
        const { getByTestId } = renderCheck({ outcome, value });

        expect(
          getByTestId(
            SecurityTabSelectors.rowValue(ContractCheckKey.NoHoneypot),
          ),
        ).toHaveTextContent(value);
        expect(
          getByTestId(
            SecurityTabSelectors.rowIcon(ContractCheckKey.NoHoneypot),
          ),
        ).toBeOnTheScreen();
      },
    );

    // Blockaid reports the risks it detected, never the checks it ran, so a
    // tick on an unresolved check would assert a result the API never
    // returned. Every route to "not established" has to land on a bare dash.
    it.each([
      ['an absent check', undefined],
      ['an explicitly unknown check', { outcome: 'unknown', value: null }],
      [
        'an unknown check that still carries a value',
        { outcome: 'unknown', value: 'Clean' },
      ],
    ] as const)('shows a dash and no glyph for %s', (_label, check) => {
      const { getByTestId, queryByTestId } = renderCheck(check);

      expect(
        getByTestId(SecurityTabSelectors.rowValue(ContractCheckKey.NoHoneypot)),
      ).toHaveTextContent(SECURITY_EMPTY_VALUE);
      expect(
        queryByTestId(
          SecurityTabSelectors.rowIcon(ContractCheckKey.NoHoneypot),
        ),
      ).toBeNull();
    });
  });

  describe('explainers', () => {
    // The tab reports the tap rather than rendering the sheet itself: the
    // design system `BottomSheet` positions against its nearest positioned
    // ancestor, so a sheet mounted in here would be clipped by the page
    // ScrollView and scroll away with the content.
    it.each([
      ['a stat row', SecurityStatKey.TopTen],
      ['a check row', ContractCheckKey.NoHoneypot],
    ] as const)('reports the tapped row for %s', (_label, rowKey) => {
      const onExplain = jest.fn();
      const { getByTestId } = renderTab({ onExplain });

      fireEvent.press(getByTestId(SecurityTabSelectors.rowLabel(rowKey)));

      expect(onExplain).toHaveBeenCalledWith(rowKey);
    });

    it('renders no sheet of its own', () => {
      const { queryByTestId } = renderTab();

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

  it('names the flag that fired instead of summarising a pass ratio', () => {
    const { getByTestId } = renderTab({
      facts: {
        ...MOCK_SECURITY_FACTS_EVM,
        verdict: 'high_risk',
        highRiskFlag: 'The blacklist function is included',
      },
    });

    expect(getByTestId(SecurityTabSelectors.HIGH_RISK_FLAG)).toHaveTextContent(
      'The blacklist function is included',
    );
  });

  it('shows no flag line for verdicts that carry no named flag', () => {
    const { queryByTestId } = renderTab();

    expect(queryByTestId(SecurityTabSelectors.HIGH_RISK_FLAG)).toBeNull();
  });

  // The prototype shows the same two figures twice over: once in the bar's
  // legend and again as tappable rows. Only the rows carry the definitions, so
  // dropping either half loses something.
  it('shows the holders figures in both the legend and the rows', () => {
    const { getByTestId } = renderTab();

    expect(getByTestId(SecurityTabSelectors.LEGEND_TOP_TEN)).toHaveTextContent(
      'Top 10 18.4%',
    );
    expect(
      getByTestId(SecurityTabSelectors.rowValue(SecurityStatKey.TopTen)),
    ).toHaveTextContent('18.4%');
  });

  it('orders the holders rows as the prototype does', () => {
    const { getByTestId } = renderTab();

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

  it('shows the listed-on-exchange row in the trading section', () => {
    const { getByTestId } = renderTab();

    expect(
      within(getByTestId(SecurityTabSelectors.SECTION_TRADING)).getByTestId(
        SecurityTabSelectors.rowValue(SecurityStatKey.ListedOnExchange),
      ),
    ).toHaveTextContent('No');
  });

  describe('section dividers', () => {
    it('separates each pair of sections with one rule', () => {
      const { getAllByTestId } = renderTab();

      // Five sections, so four gaps between them. The count is the assertion:
      // a rule attached to the wrong side would still render, just not here.
      expect(getAllByTestId(SecurityTabSelectors.SECTION_DIVIDER)).toHaveLength(
        4,
      );
    });

    // Trading drops out on a chain with no fee data. Its rule has to leave with
    // it, or the gap it vacates shows two rules with nothing between them.
    it('drops a rule along with the section it separates', () => {
      const { getAllByTestId } = renderTab({
        facts: MOCK_SECURITY_FACTS_SOLANA,
      });

      expect(getAllByTestId(SecurityTabSelectors.SECTION_DIVIDER)).toHaveLength(
        3,
      );
    });
  });
});
