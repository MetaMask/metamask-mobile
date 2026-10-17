import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import ResourceRing from './ResourceRing';
import { useTronResources } from './useTronResources';

const TronEnergyBandwidthDetail = () => {
  const { energy, bandwidth, isLoading } = useTronResources();

  // Info about how much energy and bandwidth is needed for a TRC20 transfer and a TRX transfer
  const ENERGY_PER_TRC20_TRANSFER_BASELINE = 65000;
  const BANDWIDTH_PER_TRX_TRANSFER_BASELINE = 280;

  const usdtTransfersCovered = energy.unknown
    ? 0
    : Math.floor((energy.current || 0) / ENERGY_PER_TRC20_TRANSFER_BASELINE);
  const trxTxsCovered = bandwidth.unknown
    ? 0
    : Math.floor(
        (bandwidth.current || 0) / BANDWIDTH_PER_TRX_TRANSFER_BASELINE,
      );

  const formatResourceAmount = (value: number, unknown: boolean) =>
    unknown ? '-' : value.toLocaleString();
  return (
    <Box twClassName="w-full bg-default p-4 mt-4 mb-4">
      <Text variant={TextVariant.BodyLg}>
        {strings('asset_overview.tron.daily_resource')}
      </Text>
      <Text variant={TextVariant.BodyMd} twClassName="text-alternative mt-2">
        {strings('asset_overview.tron.daily_resource_description')}
      </Text>

      {!isLoading && (
        <>
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
              <ResourceRing
                icon={IconName.Flash}
                progress={energy.unknown ? 0 : energy.percentage / 100}
              />
              <Box>
                <Text variant={TextVariant.BodyLg}>
                  {strings('asset_overview.tron.energy')}
                </Text>
                {energy.unknown ? (
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-alternative"
                  >
                    {strings('asset_overview.tron.resource_unavailable')}
                  </Text>
                ) : usdtTransfersCovered === 1 ? (
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-alternative"
                  >
                    {strings(
                      'asset_overview.tron.sufficient_to_cover_usdt_transfer',
                    )}
                  </Text>
                ) : (
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-alternative"
                  >
                    {strings(
                      'asset_overview.tron.sufficient_to_cover_usdt_transfers',
                      {
                        amount: usdtTransfersCovered,
                      },
                    )}
                  </Text>
                )}
              </Box>
            </Box>
            <Box flexDirection={BoxFlexDirection.Row}>
              <Text variant={TextVariant.BodyLg}>
                {formatResourceAmount(energy.current, energy.unknown)}
              </Text>
              <Text variant={TextVariant.BodyLg} color={TextColor.TextMuted}>
                /{formatResourceAmount(energy.max, energy.unknown)}
              </Text>
            </Box>
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
              <ResourceRing
                icon={IconName.Connect}
                progress={bandwidth.unknown ? 0 : bandwidth.percentage / 100}
              />
              <Box>
                <Text variant={TextVariant.BodyLg}>
                  {strings('asset_overview.tron.bandwidth')}
                </Text>
                {bandwidth.unknown ? (
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-alternative"
                  >
                    {strings('asset_overview.tron.resource_unavailable')}
                  </Text>
                ) : trxTxsCovered === 1 ? (
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-alternative"
                  >
                    {strings(
                      'asset_overview.tron.sufficient_to_cover_trx_transfer',
                    )}
                  </Text>
                ) : (
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-alternative"
                  >
                    {strings(
                      'asset_overview.tron.sufficient_to_cover_trx_transfers',
                      { amount: trxTxsCovered },
                    )}
                  </Text>
                )}
              </Box>
            </Box>
            <Box flexDirection={BoxFlexDirection.Row}>
              <Text variant={TextVariant.BodyLg}>
                {formatResourceAmount(bandwidth.current, bandwidth.unknown)}
              </Text>
              <Text variant={TextVariant.BodyLg} color={TextColor.TextMuted}>
                /{formatResourceAmount(bandwidth.max, bandwidth.unknown)}
              </Text>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default TronEnergyBandwidthDetail;
