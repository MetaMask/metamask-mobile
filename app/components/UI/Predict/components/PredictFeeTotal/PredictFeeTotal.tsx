import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import MembershipVipBadge from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import { formatPrice } from '../../utils/format';
import type { PredictFeePolicy } from '../../types';

interface PredictFeeTotalProps {
  total: number;
  originalTotal?: number;
  feePolicy?: PredictFeePolicy;
  fontWeight: FontWeight;
}

const PredictFeeTotal = ({
  total,
  originalTotal,
  feePolicy,
  fontWeight,
}: PredictFeeTotalProps) => (
  <Box twClassName="flex-row items-center gap-2">
    {Boolean(feePolicy?.builderCode) && originalTotal !== undefined && (
      <>
        <MembershipVipBadge hasProEntitlement />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={fontWeight}
          color={TextColor.TextAlternative}
          twClassName="line-through"
        >
          {formatPrice(originalTotal, { maximumDecimals: 2 })}
        </Text>
      </>
    )}
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={fontWeight}
      color={TextColor.TextDefault}
    >
      {formatPrice(total, { maximumDecimals: 2 })}
    </Text>
  </Box>
);

export default PredictFeeTotal;
