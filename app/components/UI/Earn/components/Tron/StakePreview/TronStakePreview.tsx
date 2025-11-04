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
import { TRON_RESOURCE } from '../../../../../../core/Multichain/constants';
import { ResourceType } from '../ResourceToggle';
import { ComputeFeeResult } from '../../../utils/tron-staking';

export interface TronStakePreviewProps {
  resourceType?: ResourceType;
  fee?: ComputeFeeResult;
}

const Row = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
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

const TronStakePreview = ({
  resourceType = TRON_RESOURCE.ENERGY,
}: TronStakePreviewProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="w-full bg-default pl-6 pr-6 rounded-lg" style={tw.style()}
    >
      {/* <Row
        label={strings('asset_overview.tron.daily_resource_new_energy')}
        value={''}
      />
      {resourceType === TRON_RESOURCE.ENERGY ? (
        <Row
          label={strings('asset_overview.tron.sufficient_to_cover')}
          value={ `${0} ${strings('asset_overview.tron.transactions')}`}
        />
      ) :  null}
      <Row
        label={strings('stake.estimated_annual_reward')}
        value={''}
      />
      <Row
        label={strings('stake.tron.trx_locked_for')}
        value={''}
      /> */}
      <Row label={strings('stake.tron.fee')} value={''} />
    </Box>
  );
};

export default TronStakePreview;
