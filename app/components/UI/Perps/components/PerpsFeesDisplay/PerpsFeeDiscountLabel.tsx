import React from 'react';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MembershipVipBadge from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import type { PerpsFeeDiscountKind } from '../../utils/feeDiscount';
import { PerpsFeeDiscountLabelSelectorsIDs } from '../../Perps.testIds';

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

  if (feeDiscountKind === 'member' || feeDiscountKind === 'vip') {
    return (
      <MembershipVipBadge hasProEntitlement={feeDiscountKind === 'member'} />
    );
  }

  return (
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      testID={PerpsFeeDiscountLabelSelectorsIDs.LABEL}
    >
      {strings(
        feeDiscountKind === 'promotional'
          ? 'perps.tooltips.fees.promotional_discount'
          : 'perps.tooltips.fees.fee_discount',
      )}
    </Text>
  );
};

export default PerpsFeeDiscountLabel;
