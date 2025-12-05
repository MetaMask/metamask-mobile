import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { ResourceType } from '../ResourceToggle';
import { ComputeFeeResult } from '../../../utils/tron-staking-snap';

export interface TronStakePreviewProps {
  resourceType?: ResourceType;
  fee?: ComputeFeeResult | ComputeFeeResult[0];
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="mt-1"
  >
    <Text variant={TextVariant.BodyMd}>{label}</Text>
    <Box>{typeof value === 'string' ? <Text>{value}</Text> : value}</Box>
  </Box>
);

const TronStakePreview = ({ fee }: TronStakePreviewProps) => {
  const tw = useTailwind();

  const feeItem: ComputeFeeResult[0] | undefined = Array.isArray(fee)
    ? fee[0]
    : fee;

  return (
    <Box
      twClassName="w-full bg-default pl-6 pr-6 rounded-lg"
      style={tw.style()}
    >
      <Row
        label={strings('earn.tron.fee')}
        value={feeItem ? `${feeItem.asset.amount} ${feeItem.asset.unit}` : ''}
      />
    </Box>
  );
};

export default TronStakePreview;
