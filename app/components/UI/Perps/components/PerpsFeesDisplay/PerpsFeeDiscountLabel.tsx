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
import SealPercentIcon, { SEAL_PERCENT_ICON_SIZE } from './SealPercentIcon';

interface PerpsFeeDiscountLabelProps {
  feeDiscountPercentage?: number;
  feeDiscountKind?: PerpsFeeDiscountKind;
  /** Promo seal size in px. Ignored for VIP and member badges. */
  iconSize?: number;
}

const PerpsFeeDiscountLabel = ({
  feeDiscountPercentage,
  feeDiscountKind,
  iconSize = SEAL_PERCENT_ICON_SIZE.feeRow,
}: PerpsFeeDiscountLabelProps) => {
  if (!feeDiscountPercentage || feeDiscountPercentage <= 0) {
    return null;
  }

  if (feeDiscountKind === 'member' || feeDiscountKind === 'vip') {
    return (
      <MembershipVipBadge hasProEntitlement={feeDiscountKind === 'member'} />
    );
  }

  if (feeDiscountKind === 'promotional') {
    return (
      <SealPercentIcon
        size={iconSize}
        testID={PerpsFeeDiscountLabelSelectorsIDs.LABEL}
      />
    );
  }

  return (
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      testID={PerpsFeeDiscountLabelSelectorsIDs.LABEL}
    >
      {strings('perps.tooltips.fees.fee_discount')}
    </Text>
  );
};

export default PerpsFeeDiscountLabel;
