import React from 'react';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import RewardsVipBadge from '../../../Rewards/components/RewardsVipBadge/RewardsVipBadge';
import type { PerpsFeeDiscountKind } from '../../utils/feeDiscount';

interface PerpsFeeDiscountLabelProps {
  feeDiscountPercentage?: number;
  feeDiscountKind?: PerpsFeeDiscountKind;
}

const PerpsFeeDiscountLabel = ({
  feeDiscountPercentage,
  feeDiscountKind,
}: PerpsFeeDiscountLabelProps) => {
  if (!feeDiscountPercentage || feeDiscountPercentage <= 0) {
    return null;
  }

  if (feeDiscountKind === 'vip') {
    return <RewardsVipBadge />;
  }

  return (
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {strings(
        feeDiscountKind === 'promotional'
          ? 'perps.tooltips.fees.promotional_discount'
          : 'perps.tooltips.fees.fee_discount',
      )}
    </Text>
  );
};

export default PerpsFeeDiscountLabel;
