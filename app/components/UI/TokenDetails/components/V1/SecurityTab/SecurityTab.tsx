import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  SectionDivider,
  SectionHeader,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { TokenStatValues } from '../../../constants/tokenStats';
import HoldersDistributionBar from './components/HoldersDistributionBar';
import SecurityAttribution from '../SecurityAttribution/SecurityAttribution';
import SecurityRow from './components/SecurityRow';
import {
  checkLabelKey,
  resolveCheckPresentation,
  SECURITY_SECTIONS,
  SECURITY_STAT_LABEL_KEYS,
  type SecurityStatRowKey,
} from './SecurityTab.constants';
import { SecurityTabSelectors } from './SecurityTab.testIds';
import {
  CONTRACT_CHECK_KEYS,
  type ContractCheckKey,
  type SecurityCheck,
  type SecurityFacts,
  type SecurityRowKey,
} from './SecurityTab.types';

export interface SecurityTabProps {
  /**
   * What Blockaid concluded — the checks, the risks behind them, the verdict.
   *
   * Passed in rather than read from a hook so the tab stays a pure function of
   * its props, which is what makes both chain fixtures renderable in tests.
   */
  facts: SecurityFacts;
  /**
   * Every figure the tab shows, formatted and keyed by stat.
   *
   * The same record the stat bar renders from, which is why ten of these rows
   * cannot disagree with the bar above them. Each carries its own `isLoading`
   * and `isWarning`, so a row waiting on the price API shows a skeleton while
   * its neighbours show values.
   */
  stats: TokenStatValues;
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
   * Opens the Contract security screen, which repeats these five checks with
   * their definitions printed and lists what Blockaid actually found.
   *
   * Reported rather than navigated for the same reason as `onExplain`: the tab
   * stays a pure function of its props, so tests render it without a
   * navigation container.
   */
  onOpenContractDetails: () => void;
  /**
   * Reports a tap on the Blockaid provenance line, so the screen can open the
   * disclaimer in `SECURITY_ATTRIBUTION_EXPLAINER`.
   *
   * Separate from `onExplain` because that one takes a `SecurityRowKey` and
   * resolves its copy through `EXPLAINER_KEYS_BY_ROW`, a full `Record` over
   * the rows. The provenance line is not a row, so giving it a key there would
   * mean widening the union that enforces every row has a definition.
   *
   * Reported rather than handled for the same reason as `onExplain`: the sheet
   * has to mount outside the page `ScrollView`.
   */
  onExplainAttribution: () => void;
  /**
   * Whole minutes since the security payload was fetched, or `null` before
   * anything has been fetched.
   *
   * Kept off `facts` on purpose. It is provenance of the request rather than
   * anything Blockaid concluded, and a ticking value on `facts` would
   * re-memoize `useSecurityFacts` every tick, handing down fresh `risks` and
   * `checks` arrays and re-rendering the whole tab to change one line of grey
   * text.
   */
  fetchedMinutesAgo: number | null;
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
 *
 * Also the Contract heading's fallback when there is nothing to drill into,
 * which is why it is declared above `CheckRow` rather than beside the other
 * section helpers.
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
 * drops out takes its own rule with it rather than leaving two stacked with
 * nothing between them.
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
  const { icon, valueColor } = resolveCheckPresentation(checkKey, outcome);

  return (
    <SecurityRow
      rowKey={checkKey}
      label={strings(checkLabelKey(checkKey))}
      value={outcome === 'unknown' ? null : (check?.value ?? null)}
      icon={icon}
      valueColor={valueColor}
      onExplain={onExplain}
    />
  );
};

/**
 * A stat row differs from a check only in where its label comes from and in
 * taking its whole presentation — value, amber, skeleton — from one entry in
 * the shared stats record.
 */
const StatRow = ({
  statKey,
  stats,
  onExplain,
}: {
  statKey: SecurityStatRowKey;
  stats: TokenStatValues;
  onExplain: (rowKey: SecurityRowKey) => void;
}) => {
  const stat = stats[statKey];

  return (
    <SecurityRow
      rowKey={statKey}
      label={strings(SECURITY_STAT_LABEL_KEYS[statKey])}
      value={stat?.value ?? null}
      isLoading={stat?.isLoading}
      onExplain={onExplain}
    />
  );
};

/**
 * "We found N risks", tappable through to the list behind the number.
 *
 * The count is the number of rows the Contract security screen will draw, not
 * the number of features Blockaid returned, so tapping through never shows
 * fewer findings than the banner promised. It renders only when that count is
 * non-zero, which is why the copy can state a number without hedging.
 *
 * `BannerAlert` already matches the design almost everywhere: its base pads
 * 12/16, gaps 16, rounds `xl` and centres a single line of medium-weight
 * `text-default` beside the severity glyph, and `Danger` resolves to the muted
 * error surface with the error-tinted triangle. Two overrides remain. The 16px
 * above it, and the title size: the banner defaults to `BodyMd`, 16px here,
 * where the design asks for 14px, so `titleProps` drops it to `BodySm` and
 * leaves the weight and colour the banner already gets right. That is the same
 * pairing the risk titles on the Contract security screen use, which is the
 * screen this banner opens.
 *
 * Wrapped in a `TouchableOpacity` because `BannerBaseProps` extends
 * `Omit<BoxProps, 'children'>` and exposes no container `onPress` — only
 * `actionButtonLabel`, which would add a button the design does not have.
 */
const RiskBanner = ({
  riskCount,
  isHighRisk,
  onPress,
}: {
  riskCount: number;
  isHighRisk: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    testID={SecurityTabSelectors.RISK_BANNER}
  >
    <BannerAlert
      severity={
        isHighRisk ? BannerAlertSeverity.Danger : BannerAlertSeverity.Warning
      }
      title={strings('token_details_v1.security_tab.risk_banner', {
        count: riskCount,
      })}
      titleProps={{ variant: TextVariant.BodySm }}
      twClassName="mt-4"
    />
  </TouchableOpacity>
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
  stats,
  onExplain: handleExplain,
  onOpenContractDetails: handleOpenContractDetails,
  onExplainAttribution: handleExplainAttribution,
  fetchedMinutesAgo,
}) => {
  const { checks, risks } = facts;

  /**
   * Whether there is anything behind the Contract heading worth a tap.
   *
   * The same gate as the banner, so the two affordances for that screen never
   * disagree: a token with nothing detected gets neither. The screen's first
   * half repeats these five rows with their definitions printed, which the
   * explainer behind each label already offers in place, so the only thing
   * reaching it adds is the list that is empty here.
   */
  const hasContractDetails = risks.length > 0;

  const renderStatRows = (statKeys: readonly SecurityStatRowKey[]) =>
    statKeys.map((statKey) => (
      <StatRow
        key={statKey}
        statKey={statKey}
        stats={stats}
        onExplain={handleExplain}
      />
    ));

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
          title's own text box.

          A clean token falls back to the plain `SectionTitle` every other
          section uses, rather than this header with `isInteractive` off:
          `SectionHeaderProps` is a union whose non-interactive branch takes
          `ViewProps` and so has no `onPress`, and the fallback is exactly that
          branch already. It also regains the heading role, which is the more
          useful announcement once there is nothing to navigate to. */}
      <Box testID={SecurityTabSelectors.SECTION_CHECKS}>
        {hasContractDetails ? (
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
        ) : (
          <SectionTitle titleKey="token_details_v1.security_tab.sections.contract" />
        )}
        {CONTRACT_CHECK_KEYS.map((checkKey) => (
          <CheckRow
            key={checkKey}
            checkKey={checkKey}
            check={checks[checkKey]}
            onExplain={handleExplain}
          />
        ))}
        {risks.length > 0 ? (
          <RiskBanner
            riskCount={risks.length}
            isHighRisk={facts.verdict === 'high_risk'}
            onPress={handleOpenContractDetails}
          />
        ) : null}
        {/* Provenance for the rows above: they come from a third-party scan,
            and naming the provider plus when we last fetched is what lets the
            reader judge how much to trust a tick that may be hours old. Under
            a minute the clause drops rather than reading "0 min". */}
        <SecurityAttribution
          fetchedMinutesAgo={fetchedMinutesAgo}
          testID={SecurityTabSelectors.SCAN_META}
          twClassName="pt-2"
          onPress={handleExplainAttribution}
        />
      </Box>

      {/* ── Holders ─────────────────────────────────────────────────────────
          The bar and its inline legend lead, then Holders and Top 10 repeat as
          tappable rows. The duplication is the prototype's: the legend labels
          the picture, the rows carry the definitions behind a dotted
          underline. */}
      <SectionRule />
      <Box testID={SecurityTabSelectors.SECTION_HOLDERS}>
        <SectionTitle titleKey="token_details_v1.security_tab.sections.holders" />
        <HoldersDistributionBar topTenPercentage={facts.topTenPercentage} />
        <Box twClassName="pt-3">
          {renderStatRows(SECURITY_SECTIONS.holders)}
        </Box>
      </Box>

      {/* ── Liquidity ───────────────────────────────────────────────────── */}
      <SectionRule />
      <Box testID={SecurityTabSelectors.SECTION_LIQUIDITY}>
        <SectionTitle titleKey="token_details_v1.security_tab.sections.liquidity" />
        {renderStatRows(SECURITY_SECTIONS.liquidity)}
      </Box>

      {/* ── Trading ─────────────────────────────────────────────────────────
          Always rendered. An earlier revision dropped the whole section when
          `fees` came back empty, which is every Solana token — and took Volume
          flags and Listed on exchange with it, both of which Solana does
          report. Each row now dashes out on its own. */}
      <SectionRule />
      <Box testID={SecurityTabSelectors.SECTION_TRADING}>
        <SectionTitle titleKey="token_details_v1.security_tab.sections.trading" />
        {renderStatRows(SECURITY_SECTIONS.trading)}
      </Box>

      {/* ── Origin ──────────────────────────────────────────────────────── */}
      <SectionRule />
      <Box testID={SecurityTabSelectors.SECTION_ORIGIN}>
        <SectionTitle titleKey="token_details_v1.security_tab.sections.origin" />
        {renderStatRows(SECURITY_SECTIONS.origin)}
      </Box>
    </Box>
  );
};

export default SecurityTab;
