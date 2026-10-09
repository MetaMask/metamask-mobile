import React from 'react';
import {
  Box,
  SectionDivider,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import HoldersDistributionBar from './components/HoldersDistributionBar';
import SecurityRow from './components/SecurityRow';
import {
  CHECK_OUTCOME_PRESENTATION,
  SECURITY_CHECK_LABEL_KEYS,
  SECURITY_CONTRACT_CHECKS,
  SECURITY_STAT_LABEL_KEYS,
} from './SecurityTab.constants';
import { SecurityTabSelectors } from './SecurityTab.testIds';
import {
  SecurityStatKey,
  type ContractCheckKey,
  type SecurityCheck,
  type SecurityRowKey,
  type SecurityTabFacts,
} from './SecurityTab.types';

export interface SecurityTabProps {
  /**
   * Everything the tab renders, already formatted.
   *
   * Passed in rather than read from a hook so the tab stays a pure function of
   * its facts — which is what makes both chain fixtures renderable in tests and
   * lets the eventual data wiring land in the caller.
   */
  facts: SecurityTabFacts;
  /**
   * Reports which row's label was tapped so the screen can open its explainer.
   *
   * The sheet is deliberately not rendered here. The design system
   * `BottomSheet` positions itself `absolute inset-0` against its nearest
   * positioned ancestor rather than through a portal, so a sheet opened from
   * inside this tab would anchor to the tab's own box inside the page
   * `ScrollView` — clipped by the scroll viewport, offset down the page and
   * scrolling with the content. It has to be mounted as a sibling of that
   * `ScrollView`, which only the screen can do.
   */
  onExplain: (rowKey: SecurityRowKey) => void;
  /**
   * Opens the Contract security screen, which repeats these four checks with
   * their definitions printed and adds the three additional ones.
   *
   * Reported rather than navigated for the same reason as `onExplain`: the tab
   * stays a pure function of its props, so tests render it without a
   * navigation container.
   */
  onOpenContractDetails: () => void;
}

/**
 * A section title.
 *
 * Wraps the design system's `SectionHeader` for two reasons that apply to every
 * heading on this tab.
 *
 * The first is padding. `SectionHeader` bakes in `px-4 pb-2 pt-3`, but this tab
 * already pads itself and spaces its sections with `gap-6`, so the horizontal
 * inset has to be cancelled or every title would sit 32px in while its rows sat
 * at 16px. Note that the design system concatenates these strings rather than
 * resolving conflicts, so the override works by arriving last.
 *
 * The second is the header role. `SectionHeader` never sets one — it only
 * assumes `button` when interactive — so without this, VoiceOver and TalkBack
 * users get no way to jump between sections on a tab this long (WCAG 1.3.1,
 * 2.4.6). It goes on `titleProps` so it lands on the `Text` itself rather than
 * the surrounding row.
 */
const SectionTitle = ({ titleKey }: { titleKey: string }) => (
  <SectionHeader
    title={strings(titleKey)}
    titleProps={{ accessibilityRole: 'header' }}
    twClassName="px-0 pb-3 pt-0"
  />
);

/**
 * Rule between two sections.
 *
 * `-mx-4` cancels the tab's own padding so the line reaches both screen edges
 * while the rows stay inset, which is how the prototype draws it.
 *
 * `marginVertical={0}` drops the design system's 20px default, leaving the
 * container's own `gap-6` as the single source of spacing between sections.
 *
 * Rendered above the section it separates rather than below, so a section that
 * drops out takes its own rule with it — Trading is absent on any chain with no
 * fee data, and a rule that belonged to the section above would survive it and
 * leave two rules stacked with nothing between them.
 */
const SectionRule = () => (
  <SectionDivider
    marginVertical={0}
    twClassName="-mx-4"
    testID={SecurityTabSelectors.SECTION_DIVIDER}
  />
);

/**
 * One contract check — a label, a pass/fail glyph and the check's own wording.
 *
 * An unresolved check shows a dimmed dash and no glyph. That matters more here
 * than on the stat rows: Blockaid reports only the risks it detected and never
 * the checks it ran, so a green tick for "nothing found" would claim a test
 * result that does not exist. An absent check and an explicit `unknown` have to
 * land on the same dash.
 */
const CheckRow = ({
  checkKey,
  check,
  onExplain,
}: {
  checkKey: ContractCheckKey;
  check?: SecurityCheck;
  onExplain: (rowKey: SecurityRowKey) => void;
}) => {
  const outcome = check?.outcome ?? 'unknown';
  const { icon, valueColor } = CHECK_OUTCOME_PRESENTATION[outcome];

  return (
    <SecurityRow
      rowKey={checkKey}
      label={strings(SECURITY_CHECK_LABEL_KEYS[checkKey])}
      value={outcome === 'unknown' ? null : (check?.value ?? null)}
      icon={icon}
      valueColor={valueColor}
      onExplain={onExplain}
    />
  );
};

/** A stat row differs from a check only in where its label comes from. */
const StatRow = ({
  statKey,
  value,
  onExplain,
}: {
  statKey: SecurityStatKey;
  value: string | null;
  onExplain: (rowKey: SecurityRowKey) => void;
}) => (
  <SecurityRow
    rowKey={statKey}
    label={strings(SECURITY_STAT_LABEL_KEYS[statKey])}
    value={value}
    onExplain={onExplain}
  />
);

/**
 * Security tab of the Token Details V1 page.
 *
 * Five sections of plain label-and-value rows, every label carrying a dotted
 * underline that opens a definition. Stateless: rows report which label was
 * tapped and the screen owns both the open row and the one sheet rendered for
 * it, so there is one sheet on the page rather than sixteen.
 *
 * Sections are local functions rather than separate files: each is a header
 * plus two to four rows and none is reused, so splitting them would buy
 * indirection and nothing else.
 */
export const SecurityTab: React.FC<SecurityTabProps> = ({
  facts,
  onExplain: handleExplain,
  onOpenContractDetails: handleOpenContractDetails,
}) => {
  const { checks, holders, liquidity, trading, origin } = facts;

  return (
    <Box twClassName="gap-6 px-4 pb-6 pt-4" testID={SecurityTabSelectors.TAB}>
      {/* ── Contract ────────────────────────────────────────────────────────
          The heading itself is the affordance for the detail screen rather than
          a trailing "See all" row.

          `isInteractive` supplies the Pressable, the button role and the
          trailing disclosure arrow, which is where the design system puts a
          chevron. Its `titleAccessory` slot would sit the arrow against the
          title instead, but that slot is documented as not being for chevrons,
          so this follows the component rather than the prototype's placement.

          It also means the press target is the whole header row instead of the
          title's own text box. */}
      <Box testID={SecurityTabSelectors.SECTION_CHECKS}>
        <SectionHeader
          isInteractive
          title={strings('token_details_v1.security_tab.sections.contract')}
          onPress={handleOpenContractDetails}
          accessibilityLabel={strings(
            'token_details_v1.security_tab.contract_details_link',
          )}
          twClassName="px-0 pb-3 pt-0"
          testID={SecurityTabSelectors.CONTRACT_DETAILS_LINK}
        />
        {/* The flag is named rather than summarised as a pass ratio: "3 of 4
            checks passed" hides which one failed, and the failure is the only
            part the reader can act on. */}
        {facts.verdict === 'high_risk' && facts.highRiskFlag ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="pb-1"
            testID={SecurityTabSelectors.HIGH_RISK_FLAG}
          >
            {facts.highRiskFlag}
          </Text>
        ) : null}
        {SECURITY_CONTRACT_CHECKS.map((checkKey) => (
          <CheckRow
            key={checkKey}
            checkKey={checkKey}
            check={checks[checkKey]}
            onExplain={handleExplain}
          />
        ))}
        {/* Provenance for the four rows above: they come from a third-party
            scan, and naming the provider plus the scan's age is what lets the
            reader judge how much to trust a tick that may be hours old. A null
            age drops the freshness clause rather than guessing at a time. */}
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="pt-2"
          testID={SecurityTabSelectors.SCAN_META}
        >
          {facts.checkedMinutesAgo === null
            ? strings('token_details_v1.security_tab.checks_meta.attribution')
            : strings(
                'token_details_v1.security_tab.checks_meta.attribution_checked',
                { count: facts.checkedMinutesAgo },
              )}
        </Text>
      </Box>

      {/* ── Holders ─────────────────────────────────────────────────────────
          The bar and its inline legend lead, then Holders and Top 10 repeat as
          tappable rows. The duplication is the prototype's: the legend labels
          the picture, the rows carry the definitions behind a dotted
          underline. */}
      <SectionRule />
      <Box testID={SecurityTabSelectors.SECTION_HOLDERS}>
        <SectionTitle titleKey="token_details_v1.security_tab.sections.holders" />
        <HoldersDistributionBar
          fillPercentage={holders.topTenFillPercentage}
          topTenPercentage={holders.topTenPercentage}
          remainingPercentage={holders.remainingPercentage}
        />
        <Box twClassName="pt-3">
          <StatRow
            statKey={SecurityStatKey.Holders}
            value={holders.count}
            onExplain={handleExplain}
          />
          <StatRow
            statKey={SecurityStatKey.TopTen}
            value={holders.topTenPercentage}
            onExplain={handleExplain}
          />
        </Box>
      </Box>

      {/* ── Liquidity ───────────────────────────────────────────────────── */}
      <SectionRule />
      <Box testID={SecurityTabSelectors.SECTION_LIQUIDITY}>
        <SectionTitle titleKey="token_details_v1.security_tab.sections.liquidity" />
        <StatRow
          statKey={SecurityStatKey.TotalLiquidity}
          value={liquidity.total}
          onExplain={handleExplain}
        />
        <StatRow
          statKey={SecurityStatKey.LiquidityToMarketCap}
          value={liquidity.liquidityToMarketCap}
          onExplain={handleExplain}
        />
        <StatRow
          statKey={SecurityStatKey.LpBurnedLocked}
          value={liquidity.lpBurnedLocked}
          onExplain={handleExplain}
        />
        <StatRow
          statKey={SecurityStatKey.PrimaryPool}
          value={liquidity.primaryPool}
          onExplain={handleExplain}
        />
      </Box>

      {/* ── Trading ─────────────────────────────────────────────────────────
          Omitted entirely rather than dashed out when the chain has no fee
          data at all — Blockaid returns every `fees` field as null on Solana,
          so the section would otherwise be a heading above two dashes. */}
      {trading ? (
        <>
          <SectionRule />
          <Box testID={SecurityTabSelectors.SECTION_TRADING}>
            <SectionTitle titleKey="token_details_v1.security_tab.sections.trading" />
            <StatRow
              statKey={SecurityStatKey.BuySellTax}
              value={trading.buySellTax}
              onExplain={handleExplain}
            />
            <StatRow
              statKey={SecurityStatKey.VolumeFlags}
              value={trading.volumeFlags}
              onExplain={handleExplain}
            />
            <StatRow
              statKey={SecurityStatKey.ListedOnExchange}
              value={trading.listedOnExchange}
              onExplain={handleExplain}
            />
          </Box>
        </>
      ) : null}

      {/* ── Origin ──────────────────────────────────────────────────────── */}
      <SectionRule />
      <Box testID={SecurityTabSelectors.SECTION_ORIGIN}>
        <SectionTitle titleKey="token_details_v1.security_tab.sections.origin" />
        <StatRow
          statKey={SecurityStatKey.Created}
          value={origin.created}
          onExplain={handleExplain}
        />
      </Box>

      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        testID={SecurityTabSelectors.DISCLAIMER}
      >
        {strings('token_details_v1.security_tab.footer.disclaimer')}
      </Text>
    </Box>
  );
};

export default SecurityTab;
