import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import en from '../../../../../../../locales/languages/en.json';
import { mockTheme } from '../../../../../../util/theme';
import {
  CBXRP_VERIFIED,
  ETHOS_WARNING,
} from '../../../utils/__fixtures__/securityData';
import {
  STAT_EMPTY_VALUE,
  TokenStatKey,
  type TokenStatValues,
} from '../../../constants/tokenStats';
import { deriveSecurityFacts } from '../../../utils/securityFacts';
import { TokenExplainerSheetSelectors } from '../TokenExplainerSheet/TokenExplainerSheet.testIds';
import SecurityTab from './SecurityTab';
import {
  checkDescriptionKey,
  checkLabelKey,
  EXPLAINER_KEYS_BY_ROW,
} from './SecurityTab.constants';
import { SecurityTabSelectors } from './SecurityTab.testIds';
import {
  CONTRACT_CHECK_KEYS,
  ContractCheckKey,
  type SecurityCheck,
  type SecurityFacts,
  type SecurityRowKey,
} from './SecurityTab.types';

/** An EVM token with a complete payload. */
const EVM_FACTS = deriveSecurityFacts(CBXRP_VERIFIED);
/** A Solana token: no fees, no markets, no creation date. */
const SOLANA_FACTS = deriveSecurityFacts(ETHOS_WARNING);

/**
 * Stats written out rather than run through `useTokenStats`.
 *
 * The tab is a pure function of its props, so a literal record keeps each
 * assertion's input next to the thing it asserts. The hook's own test covers
 * that these are the figures it produces for these payloads.
 */
const EVM_STATS: TokenStatValues = {
  [TokenStatKey.Holders]: { value: '12.9K' },
  [TokenStatKey.Top10]: { value: '18.4%' },
  [TokenStatKey.Liquidity]: { value: '$680.0K' },
  [TokenStatKey.LiquidityToMarketCap]: { value: '4.52%' },
  [TokenStatKey.LpBurnedLocked]: { value: null },
  [TokenStatKey.PrimaryPool]: { value: 'Aerodrome \u00b7 CBXRP / WETH' },
  [TokenStatKey.Tax]: { value: '0% / 0%' },
  [TokenStatKey.VolumeFlags]: { value: 'None detected' },
  [TokenStatKey.ListedOnExchange]: { value: 'No' },
  [TokenStatKey.Created]: { value: 'Oct 5, 2026' },
};

/** Solana: no fees, no markets, no creation date. */
const SOLANA_STATS: TokenStatValues = {
  [TokenStatKey.Holders]: { value: '4.2K' },
  [TokenStatKey.Top10]: { value: '31.0%' },
  [TokenStatKey.Liquidity]: { value: null },
  [TokenStatKey.LiquidityToMarketCap]: { value: null },
  [TokenStatKey.LpBurnedLocked]: { value: '0.0%' },
  [TokenStatKey.PrimaryPool]: { value: null },
  [TokenStatKey.Tax]: { value: null },
  [TokenStatKey.VolumeFlags]: { value: '2 detected' },
  [TokenStatKey.ListedOnExchange]: { value: 'No' },
  [TokenStatKey.Created]: { value: null },
};

const ALL_ROW_KEYS: SecurityRowKey[] = [
  ...Object.values(ContractCheckKey),
  ...Object.values(TokenStatKey),
];

const renderTab = (
  props: Partial<React.ComponentProps<typeof SecurityTab>> = {},
) =>
  render(
    <SecurityTab
      facts={EVM_FACTS}
      stats={EVM_STATS}
      onExplain={jest.fn()}
      onOpenContractDetails={jest.fn()}
      onExplainAttribution={jest.fn()}
      fetchedMinutesAgo={null}
      {...props}
    />,
  );

/**
 * Sections whose heading is plain text.
 *
 * Contract is excluded on purpose: its heading is the affordance for the
 * detail screen, so `isInteractive` gives it the button role instead. Its own
 * test covers that.
 */
const SECTION_TITLE_KEYS = [
  [
    SecurityTabSelectors.SECTION_HOLDERS,
    'token_details_v1.security_tab.sections.holders',
  ],
  [
    SecurityTabSelectors.SECTION_LIQUIDITY,
    'token_details_v1.security_tab.sections.liquidity',
  ],
  [
    SecurityTabSelectors.SECTION_TRADING,
    'token_details_v1.security_tab.sections.trading',
  ],
  [
    SecurityTabSelectors.SECTION_ORIGIN,
    'token_details_v1.security_tab.sections.origin',
  ],
] as const;

/**
 * Asserts a locale key reaches real copy.
 *
 * An unresolved key comes back as `[missing "en.<key>" translation]`, so
 * matching the wrapper is enough — and is specific enough not to trip on copy
 * that legitimately uses the word "missing".
 */
const expectResolvable = (key: string) => {
  const resolved = strings(key);

  expect(resolved).not.toBe('');
  expect(resolved).not.toMatch(/\[missing/iu);
  expect(resolved).not.toContain(key);
};

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

  // An earlier revision dropped the whole Trading section when `fees` came
  // back empty, which is every Solana token — and took Volume flags and
  // Listed on exchange with it, both of which Solana does populate.
  it('keeps the trading section on a chain that reports no fees', () => {
    const { getByTestId } = renderTab({
      facts: SOLANA_FACTS,
      stats: SOLANA_STATS,
    });

    expect(getByTestId(SecurityTabSelectors.SECTION_TRADING)).toBeOnTheScreen();
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Tax)),
    ).toHaveTextContent(STAT_EMPTY_VALUE);
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.VolumeFlags)),
    ).toHaveTextContent('2 detected');
  });

  // Every section title, on both fixtures: the Trading section is no longer
  // dropped on a chain with no fee data, so it has a heading to expose there
  // too.
  it.each([
    ['complete data', EVM_FACTS, EVM_STATS],
    ['a chain with no fee data', SOLANA_FACTS, SOLANA_STATS],
  ] as const)(
    'exposes each section title as a header for %s',
    (_label, facts, stats) => {
      const { getByTestId } = renderTab({ facts, stats });

      for (const [selector, titleKey] of SECTION_TITLE_KEYS) {
        expect(
          within(getByTestId(selector)).getByRole('header', {
            name: strings(titleKey),
          }),
        ).toBeOnTheScreen();
      }
    },
  );

  describe('contract checks', () => {
    // An earlier revision picked a different set per chain. The list is now
    // fixed, so the same rows have to render whichever fixture is passed —
    // including the Solana one, where a check with nothing behind it falls to
    // the dash rather than disappearing.
    it.each([
      ['an EVM token', EVM_FACTS, EVM_STATS],
      ['a Solana token', SOLANA_FACTS, SOLANA_STATS],
    ] as const)(
      'renders the same five checks for %s',
      (_label, facts, stats) => {
        const { getByTestId } = renderTab({ facts, stats });

        for (const checkKey of CONTRACT_CHECK_KEYS) {
          expect(
            getByTestId(SecurityTabSelectors.row(checkKey)),
          ).toBeOnTheScreen();
        }
      },
    );

    // The one check named as a question rather than as the state we want. A
    // green tick beside "Yes" would read as reassurance about the very thing
    // the reader is wary of, and a red cross on "No" would fail a token for
    // being unable to mint.
    describe('is mintable', () => {
      it.each([
        ['pass', 'Yes'],
        ['fail', 'No'],
      ] as const)(
        'answers %s in plain text with no glyph',
        (outcome, value) => {
          const { getByTestId, queryByTestId } = renderTab({
            facts: {
              ...EVM_FACTS,
              checks: { [ContractCheckKey.IsMintable]: { outcome, value } },
            },
          });

          expect(
            getByTestId(
              SecurityTabSelectors.rowValue(ContractCheckKey.IsMintable),
            ),
          ).toHaveTextContent(value);
          expect(
            queryByTestId(
              SecurityTabSelectors.rowIcon(ContractCheckKey.IsMintable),
            ),
          ).toBeNull();
        },
      );

      it('stays on the default text colour either way', () => {
        const { getByTestId } = renderTab({
          facts: {
            ...EVM_FACTS,
            checks: {
              [ContractCheckKey.IsMintable]: { outcome: 'fail', value: 'No' },
            },
          },
        });

        expect(
          getByTestId(
            SecurityTabSelectors.rowValue(ContractCheckKey.IsMintable),
          ),
        ).toHaveStyle({ color: mockTheme.colors.text.default });
      });
    });

    // What Blockaid actually found lives behind the chevron. Listing it here
    // too would make the tab the long screen the detail screen exists to be.
    it('keeps the findings off the tab', () => {
      const { queryByText } = renderTab({
        facts: SOLANA_FACTS,
        stats: SOLANA_STATS,
      });

      for (const risk of SOLANA_FACTS.risks) {
        expect(queryByText(risk.description)).toBeNull();
      }
      expect(SOLANA_FACTS.risks.length).toBeGreaterThan(0);
    });

    it('opens the contract security screen from the heading', () => {
      const onOpenContractDetails = jest.fn();
      const { getByTestId } = renderTab({
        facts: SOLANA_FACTS,
        stats: SOLANA_STATS,
        onOpenContractDetails,
      });

      fireEvent.press(getByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK));

      expect(onOpenContractDetails).toHaveBeenCalledTimes(1);
    });

    /**
     * The chevron shares the banner's gate, so the two affordances for the
     * Contract security screen can never disagree about whether it is worth
     * reaching.
     *
     * A failed check on its own does not open it. The definition behind that
     * row is already available in place, through the dotted underline on its
     * label, so the only thing the screen adds is the list that is empty here.
     */
    describe('the chevron', () => {
      const linkFor = (facts: Partial<SecurityFacts>) =>
        renderTab({ facts: { ...EVM_FACTS, ...facts } }).queryByTestId(
          SecurityTabSelectors.CONTRACT_DETAILS_LINK,
        );

      it('is offered once something has been found', () => {
        expect(linkFor({ risks: SOLANA_FACTS.risks })).toBeOnTheScreen();
      });

      it('is withheld when a check fails but nothing was found', () => {
        expect(
          linkFor({
            checks: {
              ...EVM_FACTS.checks,
              [ContractCheckKey.NoHoneypot]: {
                outcome: 'fail',
                value: 'Honeypot detected',
              },
            },
            risks: [],
          }),
        ).toBeNull();
      });

      // The heading stays, as a plain one — and gains the header role the
      // other sections have, since there is no longer an action to announce.
      it('falls back to a plain heading when there is nothing to show', () => {
        const { queryByTestId, getByRole } = renderTab({
          facts: { ...EVM_FACTS, risks: [] },
        });

        expect(
          queryByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK),
        ).toBeNull();
        expect(
          getByRole('header', {
            name: en.token_details_v1.security_tab.sections.contract,
          }),
        ).toBeOnTheScreen();
      });
    });
  });

  // The count is the number of rows the Contract security screen will draw, so
  // tapping through can never show fewer findings than the banner promised.
  describe('risk banner', () => {
    it('counts the rows behind it and opens the screen listing them', () => {
      const onOpenContractDetails = jest.fn();
      const { getByTestId } = renderTab({
        facts: SOLANA_FACTS,
        stats: SOLANA_STATS,
        onOpenContractDetails,
      });

      const banner = getByTestId(SecurityTabSelectors.RISK_BANNER);

      expect(banner).toHaveTextContent(
        strings('token_details_v1.security_tab.risk_banner', {
          count: SOLANA_FACTS.risks.length,
        }),
      );

      fireEvent.press(banner);

      expect(onOpenContractDetails).toHaveBeenCalledTimes(1);
    });

    it('reads in the singular for one risk', () => {
      const { getByTestId } = renderTab({
        facts: { ...EVM_FACTS, risks: [SOLANA_FACTS.risks[0]] },
      });

      expect(getByTestId(SecurityTabSelectors.RISK_BANNER)).toHaveTextContent(
        'We found 1 risk',
      );
    });

    // Rendered only when the count is non-zero, so the copy can state a
    // number without hedging.
    it('is absent when nothing was found', () => {
      const { queryByTestId } = renderTab({
        facts: { ...EVM_FACTS, risks: [] },
      });

      expect(queryByTestId(SecurityTabSelectors.RISK_BANNER)).toBeNull();
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
    // Rendered from the token that has findings, since the Contract heading is
    // only a `SectionHeader` while there is somewhere to navigate to.
    it('cancels the design system inset against the tab own padding', () => {
      const { getByTestId } = renderTab({
        facts: SOLANA_FACTS,
        stats: SOLANA_STATS,
      });

      expect(
        getByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK),
      ).toHaveStyle({ paddingLeft: 0, paddingRight: 0 });
    });

    // Contract is the exception, because it navigates. A node cannot usefully
    // be both a heading and a button, and the action is the more useful of the
    // two to announce — so this one is asserted as a button on purpose rather
    // than left out of the list above by oversight.
    it('announces the contract heading as a button instead', () => {
      const { getByTestId } = renderTab({
        facts: SOLANA_FACTS,
        stats: SOLANA_STATS,
      });

      expect(
        getByTestId(SecurityTabSelectors.CONTRACT_DETAILS_LINK),
      ).toHaveProp('accessibilityRole', 'button');
    });
  });

  describe('check outcomes', () => {
    const renderCheck = (check?: SecurityCheck) =>
      renderTab({
        facts: {
          ...EVM_FACTS,
          checks: { [ContractCheckKey.NoHoneypot]: check },
        },
      });

    it.each([
      ['pass', 'Sells work'],
      ['fail', 'Sells may fail'],
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
      ).toHaveTextContent(STAT_EMPTY_VALUE);
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
      ['a stat row', TokenStatKey.Top10],
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

    // The provenance line reports separately from the rows, because it is not
    // a row and so has no key in `EXPLAINER_KEYS_BY_ROW`.
    it('reports a tap on the Blockaid provenance line', () => {
      const onExplainAttribution = jest.fn();
      const { getByTestId } = renderTab({ onExplainAttribution });

      fireEvent.press(getByTestId(SecurityTabSelectors.SCAN_META));

      expect(onExplainAttribution).toHaveBeenCalledTimes(1);
    });

    // A `Record` over every row key guarantees an entry exists, but not that
    // the entry points at a real translation. Without this, a typo in a key
    // path would render the path itself on device.
    it.each(ALL_ROW_KEYS)('has resolvable copy for %s', (rowKey) => {
      const { title, description } = EXPLAINER_KEYS_BY_ROW[rowKey];

      for (const key of [title, description]) {
        expectResolvable(key);
      }
    });
  });

  /**
   * Replaces the compile-time nudge the deleted locale-key `Record`s gave.
   *
   * Every key a check reads is now built by interpolation, so nothing fails to
   * compile when a check ships without copy — but nothing proved the copy was
   * real before either, since a `Record` only ever checked that somebody wrote
   * *a* string. Resolving the keys is strictly stronger than both.
   */
  describe('interpolated check copy', () => {
    it.each(CONTRACT_CHECK_KEYS)('resolves every key for %s', (checkKey) => {
      expectResolvable(checkLabelKey(checkKey));
      expectResolvable(checkDescriptionKey(checkKey));

      for (const outcome of ['pass', 'fail']) {
        expectResolvable(
          `token_details_v1.security_tab.check_values.${checkKey}.${outcome}`,
        );
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

  // The prototype shows the same two figures twice over: once in the bar's
  // legend and again as tappable rows. Only the rows carry the definitions, so
  // dropping either half loses something.
  it('shows the holders figures in both the legend and the rows', () => {
    const { getByTestId } = renderTab();

    expect(getByTestId(SecurityTabSelectors.LEGEND_TOP_TEN)).toHaveTextContent(
      'Top 10 18.4%',
    );
    expect(
      getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Top10)),
    ).toHaveTextContent('18.4%');
  });

  it('orders the holders rows as the prototype does', () => {
    const { getByTestId } = renderTab();

    const renderedOrder = within(
      getByTestId(SecurityTabSelectors.SECTION_HOLDERS),
    )
      .getAllByTestId(/-row-[a-z0-9_]+$/)
      .map((row) => row.props.testID);

    expect(renderedOrder).toStrictEqual([
      SecurityTabSelectors.row(TokenStatKey.Holders),
      SecurityTabSelectors.row(TokenStatKey.Top10),
    ]);
  });

  it('shows the listed-on-exchange row in the trading section', () => {
    const { getByTestId } = renderTab();

    expect(
      within(getByTestId(SecurityTabSelectors.SECTION_TRADING)).getByTestId(
        SecurityTabSelectors.rowValue(TokenStatKey.ListedOnExchange),
      ),
    ).toHaveTextContent('No');
  });

  // The tab reads the same record the stat bar does, so a row's presentation
  // is whatever that one entry says — which is what stops the two surfaces
  // reporting different figures for the ten stats they both show.
  describe('stats record', () => {
    it('renders a skeleton for a row still waiting on the price API', () => {
      const { getByTestId, queryByTestId } = renderTab({
        stats: {
          ...EVM_STATS,
          [TokenStatKey.LiquidityToMarketCap]: {
            value: null,
            isLoading: true,
          },
        },
      });

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

    // Every other row comes from the security payload, which the tab never
    // renders partially — so their absence is settled and the dash is honest.
    it('leaves the security-sourced rows unaffected by a loading stat', () => {
      const { getByTestId, queryByTestId } = renderTab({
        stats: {
          ...EVM_STATS,
          [TokenStatKey.Liquidity]: { value: null, isLoading: true },
        },
      });

      expect(
        getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.PrimaryPool)),
      ).toHaveTextContent('Aerodrome \u00b7 CBXRP / WETH');
      expect(
        queryByTestId(SecurityTabSelectors.rowSkeleton(TokenStatKey.Created)),
      ).toBeNull();
    });

    it('dashes out a stat the record omits entirely', () => {
      const { getByTestId } = renderTab({ stats: {} });

      expect(
        getByTestId(SecurityTabSelectors.rowValue(TokenStatKey.Holders)),
      ).toHaveTextContent(STAT_EMPTY_VALUE);
    });

    // Liq/MC renders amber below 5% on the bar, and now does so on the tab as
    // well, because both read the same `isWarning`.
    it('renders every stat the record carries a value for', () => {
      const { getByTestId } = renderTab();

      for (const [statKey, stat] of Object.entries(EVM_STATS)) {
        if (stat?.value == null) {
          continue;
        }
        expect(
          getByTestId(SecurityTabSelectors.rowValue(statKey as SecurityRowKey)),
        ).toHaveTextContent(stat.value);
      }
    });
  });

  // Five sections, so four gaps between them. The count is the assertion: a
  // rule attached to the wrong side would still render, just not here.
  it.each([
    ['a complete payload', EVM_FACTS, EVM_STATS],
    ['a payload full of gaps', SOLANA_FACTS, SOLANA_STATS],
  ] as const)(
    'separates each pair of sections with one rule for %s',
    (_label, facts, stats) => {
      const { getAllByTestId } = renderTab({ facts, stats });

      expect(getAllByTestId(SecurityTabSelectors.SECTION_DIVIDER)).toHaveLength(
        4,
      );
    },
  );
});
