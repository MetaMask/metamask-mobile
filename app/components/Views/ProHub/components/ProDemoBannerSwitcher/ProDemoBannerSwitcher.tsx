import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import {
  AddFundsDemoOutcome,
  MembershipBannerKind,
  type AddFundsDemoOutcome as AddFundsDemoOutcomeType,
  type MembershipBannerKind as MembershipBannerKindType,
} from '../../ProHub.constants';

/**
 * DEMO ONLY — do not merge.
 *
 * Human-readable labels for each mock membership state. Hardcoded English is
 * fine here: this control never ships, so it stays out of the locale files.
 */
const DEMO_STATE_LABELS: Record<MembershipBannerKindType, string> = {
  [MembershipBannerKind.ActiveLowBalance]: 'Low balance',
  [MembershipBannerKind.ActiveRenewalFailed]: 'Renewal failed',
  [MembershipBannerKind.Overdue]: 'Overdue',
  [MembershipBannerKind.Deactivated]: 'Deactivated',
  [MembershipBannerKind.Cancelled]: 'Cancelled',
};

const DEMO_STATE_ORDER: MembershipBannerKindType[] = [
  MembershipBannerKind.ActiveLowBalance,
  MembershipBannerKind.ActiveRenewalFailed,
  MembershipBannerKind.Overdue,
  MembershipBannerKind.Deactivated,
  MembershipBannerKind.Cancelled,
];

const DEMO_ADD_FUNDS_OUTCOME_LABELS: Record<AddFundsDemoOutcomeType, string> = {
  [AddFundsDemoOutcome.Success]: 'Funds added',
  [AddFundsDemoOutcome.Failed]: 'Failed to add funds',
};

const DEMO_ADD_FUNDS_OUTCOME_ORDER: AddFundsDemoOutcomeType[] = [
  AddFundsDemoOutcome.Success,
  AddFundsDemoOutcome.Failed,
];

export const PRO_DEMO_SWITCHER_TEST_ID = 'pro-hub-demo-banner-switcher';
export const proDemoSwitcherOptionTestId = (
  kind: MembershipBannerKindType,
): string => `${PRO_DEMO_SWITCHER_TEST_ID}-${kind}`;

export const proDemoAddFundsOutcomeTestId = (
  outcome: AddFundsDemoOutcomeType,
): string => `${PRO_DEMO_SWITCHER_TEST_ID}-add-funds-${outcome}`;

interface ProDemoBannerSwitcherProps {
  selectedKind: MembershipBannerKindType;
  onSelect: (kind: MembershipBannerKindType) => void;
  addFundsOutcome: AddFundsDemoOutcomeType;
  onAddFundsOutcomeSelect: (outcome: AddFundsDemoOutcomeType) => void;
}

/**
 * Horizontal row of pills that swap the Pro Hub membership banner between
 * every mock state so a single demo build can show them all.
 */
const ProDemoBannerSwitcher = ({
  selectedKind,
  onSelect,
  addFundsOutcome,
  onAddFundsOutcomeSelect,
}: ProDemoBannerSwitcherProps) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="gap-y-2 rounded-xl border border-dashed border-warning-default p-3"
      testID={PRO_DEMO_SWITCHER_TEST_ID}
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={TextColor.WarningDefault}
      >
        DEMO — membership state
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('gap-x-2')}
      >
        {DEMO_STATE_ORDER.map((kind) => (
          <Button
            key={kind}
            size={ButtonSize.Sm}
            variant={
              kind === selectedKind
                ? ButtonVariant.Primary
                : ButtonVariant.Secondary
            }
            onPress={() => onSelect(kind)}
            testID={proDemoSwitcherOptionTestId(kind)}
          >
            {DEMO_STATE_LABELS[kind]}
          </Button>
        ))}
      </ScrollView>
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={TextColor.WarningDefault}
      >
        DEMO — add funds result
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('gap-x-2')}
      >
        {DEMO_ADD_FUNDS_OUTCOME_ORDER.map((outcome) => (
          <Button
            key={outcome}
            size={ButtonSize.Sm}
            variant={
              outcome === addFundsOutcome
                ? ButtonVariant.Primary
                : ButtonVariant.Secondary
            }
            onPress={() => onAddFundsOutcomeSelect(outcome)}
            testID={proDemoAddFundsOutcomeTestId(outcome)}
          >
            {DEMO_ADD_FUNDS_OUTCOME_LABELS[outcome]}
          </Button>
        ))}
      </ScrollView>
    </Box>
  );
};

export default ProDemoBannerSwitcher;
