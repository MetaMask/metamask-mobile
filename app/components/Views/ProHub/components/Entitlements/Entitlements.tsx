import React from 'react';
import {
  Box,
  FontWeight,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  HUB_BENEFIT_ROWS,
  type EntitlementAction,
} from '../../../shared/pro/entitlements.constants';
import {
  ENTITLEMENT_INTRO,
  rowBarDelayMs,
  rowEntranceDelayMs,
} from './Entitlements.constants';
import EntitlementRow from './EntitlementRow';
import FadeInUp from '../FadeInUp';
import { EntitlementsTestIds } from './Entitlements.testIds';

interface EntitlementsProps {
  onAction: (action: EntitlementAction) => void;
  /**
   * When this section begins arriving, so it can fall in behind the hub's
   * opening icon rather than being on screen before it has played.
   */
  startDelayMs?: number;
}

/**
 * What the member holds.
 *
 * This is the section the hub was missing. Previously the members' area
 * rendered only the benefits that had a currency figure attached, so four of
 * the seven benefits sold on the upsell — transaction protection, ATM/FX fees,
 * priority support and the Orange app icon — appeared nowhere at all, and the
 * hub read as an earnings dashboard rather than a membership.
 *
 * The list is derived from the shared `BENEFITS` order, so it is provably the
 * same list the member was sold.
 */
const Entitlements = ({ onAction, startDelayMs = 0 }: EntitlementsProps) => {
  const rowsStartMs = startDelayMs + ENTITLEMENT_INTRO.ROW_STAGGER_MS;

  return (
    <Box twClassName="gap-y-2" testID={EntitlementsTestIds.SECTION}>
      {/* The heading leads, then the rows cascade one stagger behind it. */}
      <FadeInUp delayMs={startDelayMs} durationMs={ENTITLEMENT_INTRO.ROW_MS}>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          testID={EntitlementsTestIds.TITLE}
        >
          {strings('pro_hub.entitlements.title')}
        </Text>
      </FadeInUp>

      {/*
      `-mb-3` cancels the last row's own `py-3` so the list ends flush with its
      content. Without it that padding stacked on the following divider's
      margin, leaving noticeably more space below the final row than above it.
    */}
      <Box twClassName="-mb-3">
        {HUB_BENEFIT_ROWS.map((row, index) => (
          <React.Fragment key={row.id}>
            {/*
              A group divider arrives with the row it introduces, on that row's
              own delay — left outside the cascade it sat on screen ahead of the
              rows it was meant to separate.
            */}
            {index > 0 && row.group !== HUB_BENEFIT_ROWS[index - 1].group ? (
              <FadeInUp
                delayMs={rowsStartMs + rowEntranceDelayMs(index)}
                durationMs={ENTITLEMENT_INTRO.ROW_MS}
                travel={ENTITLEMENT_INTRO.ROW_TRAVEL}
              >
                <SectionDivider marginVertical={2} />
              </FadeInUp>
            ) : null}
            <EntitlementRow
              row={row}
              onAction={onAction}
              entranceDelayMs={rowsStartMs + rowEntranceDelayMs(index)}
              barDelayMs={rowsStartMs + rowBarDelayMs(index)}
            />
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default Entitlements;
