import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import SecurityPill from '../SecurityPill/SecurityPill';
import HoldersDistributionBar from './components/HoldersDistributionBar';
import SecurityCheckRow from './components/SecurityCheckRow';
import SecurityScanMeta from './components/SecurityScanMeta';
import SecurityStatRow from './components/SecurityStatRow';
import { SECURITY_CHECKS_BY_NAMESPACE } from './SecurityTab.constants';
import { SecurityTabSelectors } from './SecurityTab.testIds';
import {
  SecurityStatKey,
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
}

/**
 * `SectionHeading` is the 20px/600 token, matching the prototype's `h3`. The
 * variant supplies the weight, so passing `fontWeight` here would only risk
 * drifting from it.
 */
const SectionHeader = ({ titleKey }: { titleKey: string }) => (
  <Text variant={TextVariant.SectionHeading} color={TextColor.TextDefault}>
    {strings(titleKey)}
  </Text>
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
}) => {
  const { checks, holders, liquidity, trading, origin } = facts;

  return (
    <Box twClassName="gap-6 px-4 pb-6 pt-4" testID={SecurityTabSelectors.TAB}>
      {/* ── Security checks ─────────────────────────────────────────────── */}
      <Box testID={SecurityTabSelectors.SECTION_CHECKS}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-4 pb-3"
        >
          <SectionHeader titleKey="token_details_v1.security_tab.sections.checks" />
          <Box testID={SecurityTabSelectors.VERDICT}>
            <SecurityPill verdict={facts.verdict} flagCount={facts.flagCount} />
          </Box>
        </Box>
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
        {SECURITY_CHECKS_BY_NAMESPACE[facts.namespace].map((checkKey) => (
          <SecurityCheckRow
            key={checkKey}
            checkKey={checkKey}
            check={checks[checkKey]}
            onExplain={handleExplain}
          />
        ))}
        <SecurityScanMeta checkedMinutesAgo={facts.checkedMinutesAgo} />
      </Box>

      {/* ── Holders ─────────────────────────────────────────────────────────
          The bar and its inline legend lead, then Holders and Top 10 repeat as
          tappable rows. The duplication is the prototype's: the legend labels
          the picture, the rows carry the definitions behind a dotted
          underline. */}
      <Box testID={SecurityTabSelectors.SECTION_HOLDERS}>
        <Box twClassName="pb-3">
          <SectionHeader titleKey="token_details_v1.security_tab.sections.holders" />
        </Box>
        <HoldersDistributionBar
          fillPercentage={holders.topTenFillPercentage}
          topTenPercentage={holders.topTenPercentage}
          remainingPercentage={holders.remainingPercentage}
        />
        <Box twClassName="pt-3">
          <SecurityStatRow
            statKey={SecurityStatKey.Holders}
            value={holders.count}
            onExplain={handleExplain}
          />
          <SecurityStatRow
            statKey={SecurityStatKey.TopTen}
            value={holders.topTenPercentage}
            onExplain={handleExplain}
          />
        </Box>
      </Box>

      {/* ── Liquidity ───────────────────────────────────────────────────── */}
      <Box testID={SecurityTabSelectors.SECTION_LIQUIDITY}>
        <Box twClassName="pb-3">
          <SectionHeader titleKey="token_details_v1.security_tab.sections.liquidity" />
        </Box>
        <SecurityStatRow
          statKey={SecurityStatKey.TotalLiquidity}
          value={liquidity.total}
          onExplain={handleExplain}
        />
        <SecurityStatRow
          statKey={SecurityStatKey.LiquidityToMarketCap}
          value={liquidity.liquidityToMarketCap}
          onExplain={handleExplain}
        />
        <SecurityStatRow
          statKey={SecurityStatKey.LpBurnedLocked}
          value={liquidity.lpBurnedLocked}
          onExplain={handleExplain}
        />
        <SecurityStatRow
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
        <Box testID={SecurityTabSelectors.SECTION_TRADING}>
          <Box twClassName="pb-3">
            <SectionHeader titleKey="token_details_v1.security_tab.sections.trading" />
          </Box>
          <SecurityStatRow
            statKey={SecurityStatKey.BuySellTax}
            value={trading.buySellTax}
            onExplain={handleExplain}
          />
          <SecurityStatRow
            statKey={SecurityStatKey.VolumeFlags}
            value={trading.volumeFlags}
            onExplain={handleExplain}
          />
        </Box>
      ) : null}

      {/* ── Origin ──────────────────────────────────────────────────────── */}
      <Box testID={SecurityTabSelectors.SECTION_ORIGIN}>
        <Box twClassName="pb-3">
          <SectionHeader titleKey="token_details_v1.security_tab.sections.origin" />
        </Box>
        <SecurityStatRow
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
