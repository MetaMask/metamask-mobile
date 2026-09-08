import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  ClaimDto,
  ClaimLifecycleStatus,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { formatMusd } from '../../utils/format';

interface ClaimsRowProps {
  claim: ClaimDto;
  /** Omitted when nothing is openable, which is what makes the row inert. */
  onPress?: () => void;
  /** True when the target was inferred rather than known, softening the label. */
  isInferredMatch?: boolean;
  testID?: string;
}

/**
 * How each lifecycle state reads.
 *
 * `PENDING_SIGNATURE` folds in with `AUTHORIZED`: it is transient, swept to
 * `FAILED` within a couple of minutes, and naming it would expose an internal
 * step the user cannot act on.
 *
 * `EXPIRED` and `FAILED` are muted rather than error-coloured on purpose —
 * nothing bad happened to the user's money. A lapsed or failed voucher is
 * released back to claimable, so red would be a lie.
 */
const STATUS_PRESENTATION: Record<
  ClaimLifecycleStatus,
  { labelKey: string; color: TextColor }
> = {
  SETTLED: {
    labelKey: 'rewards_money.claims.status_confirmed',
    color: TextColor.SuccessDefault,
  },
  AUTHORIZED: {
    labelKey: 'rewards_money.claims.status_pending',
    color: TextColor.InfoDefault,
  },
  PENDING_SIGNATURE: {
    labelKey: 'rewards_money.claims.status_pending',
    color: TextColor.InfoDefault,
  },
  EXPIRED: {
    labelKey: 'rewards_money.claims.status_expired',
    color: TextColor.TextAlternative,
  },
  FAILED: {
    labelKey: 'rewards_money.claims.status_failed',
    color: TextColor.TextAlternative,
  },
};

const ClaimsRow: React.FC<ClaimsRowProps> = ({
  claim,
  onPress,
  isInferredMatch,
  testID,
}) => {
  const presentation =
    STATUS_PRESENTATION[claim.status] ?? STATUS_PRESENTATION.PENDING_SIGNATURE;

  const body = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-4 gap-3"
      testID={testID}
    >
      <Box twClassName="flex-1 gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('rewards_money.claims.row_title')}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={presentation.color}
          numberOfLines={1}
        >
          {strings(presentation.labelKey)}
          {isInferredMatch
            ? ` · ${strings('rewards_money.claims.likely_transaction')}`
            : ''}
        </Text>
      </Box>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {formatMusd(claim.net_amount)}
      </Text>
    </Box>
  );

  if (!onPress) {
    return body;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      testID={`${testID}-pressable`}
    >
      {body}
    </TouchableOpacity>
  );
};

export { STATUS_PRESENTATION };
export default ClaimsRow;
