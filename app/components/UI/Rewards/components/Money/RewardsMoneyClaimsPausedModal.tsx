import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  FontWeight,
  KeyValueRow,
  KeyValueRowVariant,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatMusdBaseUnits } from '../../utils/formatUtils';

export const REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS = {
  CONTAINER: 'rewards-money-claims-paused-modal',
  TITLE: 'rewards-money-claims-paused-modal-title',
  DESCRIPTION: 'rewards-money-claims-paused-modal-description',
  DIVIDER: 'rewards-money-claims-paused-modal-divider',
  BREAKDOWN_HEADER: 'rewards-money-claims-paused-modal-breakdown-header',
  TOTALS: 'rewards-money-claims-paused-modal-totals',
  CLOSE: 'rewards-money-claims-paused-modal-close',
  GOT_IT: 'rewards-money-claims-paused-modal-got-it',
} as const;

/**
 * Root summary totals for the Claims paused sheet. `lifetime_total` is the
 * backend lifetime, including voided money until that change lands.
 */
/** Root summary amounts. These are base units, not the localized-text keys. */
export interface ClaimsPausedTotals {
  lifetime_total: string;
  claimable?: string;
  held?: string;
  blocked?: string;
  voided?: string;
  pending: string;
  claimed: string;
}

/**
 * Copy for the rows. Keys match `localized_text`: `held`, `blocked`,
 * `voided`, `pending`, and `claimed`.
 */
export interface ClaimsPausedLabels {
  breakdown: string;
  recordedEarningsLabel: string;
  availableToClaim: string;
  held: string;
  blocked: string;
  voided: string;
  pending: string;
  claimed: string;
}

export interface RewardsMoneyClaimsPausedModalParams {
  title: string;
  description?: string;
  totals?: ClaimsPausedTotals;
  labels?: ClaimsPausedLabels;
  /**
   * `breakdown` is the info sheet beside the earnings amount. It shows the
   * same rows as the paused sheet, without the paused title and description.
   */
  variant?: 'paused' | 'breakdown';
}

function musdAmount(baseUnits: string | null | undefined): string {
  return formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 2 }) ?? '—';
}

type ClaimsPausedAmountKey =
  | 'lifetime_total'
  | 'claimable'
  | 'held'
  | 'blocked'
  | 'voided'
  | 'pending'
  | 'claimed';

const TOTAL_ROWS: {
  key: ClaimsPausedAmountKey;
  label: (labels: ClaimsPausedLabels) => string;
}[] = [
  {
    key: 'lifetime_total',
    label: (labels) => labels.recordedEarningsLabel,
  },
  {
    key: 'claimable',
    label: (labels) => labels.availableToClaim,
  },
  { key: 'held', label: (labels) => labels.held },
  { key: 'blocked', label: (labels) => labels.blocked },
  { key: 'voided', label: (labels) => labels.voided },
  { key: 'pending', label: (labels) => labels.pending },
  { key: 'claimed', label: (labels) => labels.claimed },
];

const ClaimsPausedTotalsRows: React.FC<{
  totals: ClaimsPausedTotals;
  labels: ClaimsPausedLabels;
}> = ({ totals, labels }) => (
  <>
    {TOTAL_ROWS.map((row) => (
      <KeyValueRow
        key={row.key}
        variant={KeyValueRowVariant.Summary}
        keyLabel={row.label(labels)}
        value={musdAmount(totals[row.key])}
        testID={`${REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.TOTALS}-${row.key}`}
      />
    ))}
  </>
);

interface RewardsMoneyClaimsPausedModalProps {
  route: {
    params: RewardsMoneyClaimsPausedModalParams;
  };
}

/**
 * Claims paused sheet, and the balance breakdown opened from the earnings
 * amount. Both show the same root summary totals. The under-review banner
 * stays on the generic info sheet.
 */
const RewardsMoneyClaimsPausedModal: React.FC<
  RewardsMoneyClaimsPausedModalProps
> = ({ route }) => {
  const {
    title,
    description,
    totals,
    labels,
    variant = 'paused',
  } = route.params;
  const isBalanceBreakdown = variant === 'breakdown';
  const navigation = useNavigation<AppNavigationProp>();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <BottomSheet
      onClose={handleClose}
      testID={REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.CLOSE,
        }}
        testID={REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.TITLE}
      >
        {title}
      </BottomSheetHeader>
      {isBalanceBreakdown ? null : (
        <Box
          twClassName="px-4"
          testID={REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.DESCRIPTION}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {description}
          </Text>
        </Box>
      )}
      {!isBalanceBreakdown && totals && labels ? (
        <>
          <SectionDivider
            marginVertical={4}
            testID={REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.DIVIDER}
          />
          <Box twClassName="px-4 mb-2">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              testID={
                REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.BREAKDOWN_HEADER
              }
            >
              {labels.breakdown}
            </Text>
          </Box>
        </>
      ) : null}
      {totals && labels ? (
        <ClaimsPausedTotalsRows totals={totals} labels={labels} />
      ) : null}
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('rewards.upcoming_rewards.cta_label'),
          onPress: handleClose,
          size: ButtonSize.Lg,
          testID: REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.GOT_IT,
        }}
        twClassName="px-4 pt-4"
      />
    </BottomSheet>
  );
};

export default RewardsMoneyClaimsPausedModal;
