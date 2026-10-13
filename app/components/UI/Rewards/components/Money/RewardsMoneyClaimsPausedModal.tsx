import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonSize,
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
  description: string;
  totals?: ClaimsPausedTotals;
  labels?: ClaimsPausedLabels;
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
  <Box
    twClassName="mt-4 gap-2"
    testID={REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.TOTALS}
  >
    {TOTAL_ROWS.map((row) => (
      <Box
        key={row.key}
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        testID={`${REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.TOTALS}-${row.key}`}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {row.label(labels)}
        </Text>
        <Text variant={TextVariant.BodyMd}>{musdAmount(totals[row.key])}</Text>
      </Box>
    ))}
  </Box>
);

interface RewardsMoneyClaimsPausedModalProps {
  route: {
    params: RewardsMoneyClaimsPausedModalParams;
  };
}

/**
 * Claims paused sheet: the shared title and description, plus the root
 * summary totals. The under-review banner stays on the generic info sheet.
 */
const RewardsMoneyClaimsPausedModal: React.FC<
  RewardsMoneyClaimsPausedModalProps
> = ({ route }) => {
  const { title, description, totals, labels } = route.params;
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
        // Header default is px-2 around a 32px button and a 24px icon, which
        // leaves the glyph 4px outside the px-4 body. 12px lines it up.
        style={{ paddingHorizontal: 12 }}
        testID={REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.TITLE}
      >
        {title}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.DESCRIPTION}
        >
          {description}
        </Text>
        {totals && labels ? (
          <ClaimsPausedTotalsRows totals={totals} labels={labels} />
        ) : null}
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('rewards.upcoming_rewards.cta_label'),
          onPress: handleClose,
          size: ButtonSize.Lg,
          testID: REWARDS_MONEY_CLAIMS_PAUSED_MODAL_TEST_IDS.GOT_IT,
        }}
        twClassName="px-4 pt-6"
      />
    </BottomSheet>
  );
};

export default RewardsMoneyClaimsPausedModal;
