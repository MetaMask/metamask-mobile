import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { selectTronResourcesBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import ResourceRing from './ResourceRing';

const TronEnergyBandwidthDetail = () => {
  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);

  const energy = tronResources.find((a) => a.symbol.toLowerCase() === 'energy');
  const bandwidth = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'bandwidth',
  );
  const maxEnergy = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'max-energy',
  );
  const maxBandwidth = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'max-bandwidth',
  );
  const strxEnergy = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-energy',
  );
  const strxBandwidth = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-bandwidth',
  );

  const parseNum = (v?: string | number) =>
    typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(/,/g, ''));

  const energyValue = parseNum(energy?.balance);
  const bandwidthValue = parseNum(bandwidth?.balance);
  const maxBandwidthValue = parseNum(maxBandwidth?.balance);
  const maxEnergyValue = parseNum(maxEnergy?.balance);
  const strxEnergyValue = parseNum(strxEnergy?.balance);
  const strxBandwidthValue = parseNum(strxBandwidth?.balance);

  const BANDWIDTH_MAX = Math.max(1, maxBandwidthValue + strxBandwidthValue);
  const bandwidthProgress = Math.min(1, (bandwidthValue || 0) / BANDWIDTH_MAX);

  const ENERGY_MAX = Math.max(1, maxEnergyValue + strxEnergyValue);
  const energyProgress = Math.min(1, (energyValue || 0) / ENERGY_MAX);

  // Info about how much energy and bandwidth is needed for a TRC20 transfer and a TRX transfer
  const ENERGY_PER_TRC20_TRANSFER_BASELINE = 65000;
  const BANDWIDTH_PER_TRX_TRANSFER_BASELINE = 280;

  const usdtTransfersCovered = Math.floor(
    (energyValue || 0) / ENERGY_PER_TRC20_TRANSFER_BASELINE,
  );
  const trxTxsCovered = Math.floor(
    (bandwidthValue || 0) / BANDWIDTH_PER_TRX_TRANSFER_BASELINE,
  );
  return (
    <Box twClassName="w-full bg-default p-4 mt-4 mb-4">
      <Text variant={TextVariant.BodyLg}>
        {strings('asset_overview.tron.daily_resource')}
      </Text>
      <Text variant={TextVariant.BodyMd} twClassName="text-alternative mt-2">
        {strings('asset_overview.tron.daily_resource_description')}
      </Text>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mt-6"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-4"
        >
          <ResourceRing icon={IconName.Flash} progress={energyProgress} />
          <Box>
            <Text variant={TextVariant.BodyLg}>
              {strings('asset_overview.tron.energy')}
            </Text>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('asset_overview.tron.sufficient_to_cover_usdt', {
                amount: usdtTransfersCovered,
              })}
            </Text>
          </Box>
        </Box>
        <Text variant={TextVariant.BodyLg}>
          {energyValue ? energyValue.toLocaleString() : '0'}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mt-6"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-4"
        >
          <ResourceRing icon={IconName.Connect} progress={bandwidthProgress} />
          <Box>
            <Text variant={TextVariant.BodyLg}>
              {strings('asset_overview.tron.bandwidth')}
            </Text>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('asset_overview.tron.sufficient_to_cover_trx', {
                amount: trxTxsCovered,
              })}
            </Text>
          </Box>
        </Box>
        <Text variant={TextVariant.BodyLg}>
          {bandwidthValue ? bandwidthValue.toLocaleString() : '0'}
        </Text>
      </Box>
    </Box>
  );
};

export default TronEnergyBandwidthDetail;
