import React from 'react';
import {
  Box,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useHistoricalVaultApys } from '../../../../hooks/useHistoricalVaultApys';
import { parseApy, toApyPercent } from '../../../../utils/apy';
import { AllocationDetailsTestIds } from './AllocationDetails.testIds';

const AllocationDetails = (): React.ReactElement => {
  const { data, isLoading: isApyLoading } = useHistoricalVaultApys();
  const historicalVault = data?.vaults[0];
  const averageApy =
    historicalVault?.periods['30d'].status === 'available'
      ? historicalVault.periods['30d'].average_apy
      : null;
  const parsedApy = parseApy(averageApy);
  const apyValue =
    parsedApy === undefined
      ? strings('money.earnings.unavailable')
      : parsedApy === 0
        ? strings('money.earnings.allocation_details.average_apy_zero')
        : strings('money.earnings.allocation_details.average_apy_value', {
            value: toApyPercent(parsedApy),
          });
  const apyColor =
    parsedApy !== undefined && parsedApy > 0
      ? TextColor.SuccessDefault
      : TextColor.TextDefault;

  const details = [
    {
      key: 'vault',
      label: strings('money.earnings.allocation_details.vault'),
      value: strings('money.earnings.allocation_details.vault_value'),
    },
    {
      key: 'base-asset',
      label: strings('money.earnings.allocation_details.base_asset'),
      value: strings('money.earnings.allocation_details.base_asset_value'),
    },
    {
      key: 'average-apy',
      label: strings('money.earnings.allocation_details.average_apy'),
      value: apyValue,
      color: apyColor,
    },
    {
      key: 'lockup-period',
      label: strings('money.earnings.allocation_details.lockup_period'),
      value: strings('money.earnings.allocation_details.lockup_period_value'),
    },
    {
      key: 'managed-by',
      label: strings('money.earnings.allocation_details.managed_by'),
      value: strings('money.earnings.allocation_details.managed_by_value'),
    },
    {
      key: 'monitored-by',
      label: strings('money.earnings.allocation_details.monitored_by'),
      value: strings('money.earnings.allocation_details.monitored_by_value'),
    },
  ];

  return (
    <Box
      testID={AllocationDetailsTestIds.CONTAINER}
      accessible={false}
      twClassName="w-full"
    >
      <Text
        testID={AllocationDetailsTestIds.HEADER}
        variant={TextVariant.HeadingMd}
      >
        {strings('money.earnings.allocation_details.title')}
      </Text>
      <Box accessible={false}>
        {details.map(({ key, label, value, color }, index) => (
          <Box
            key={key}
            twClassName={`flex-row items-center ${
              index === 0 ? 'pt-6' : 'pt-8'
            }`}
          >
            <Text
              testID={AllocationDetailsTestIds.LABEL(key)}
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="min-w-0 flex-1"
            >
              {label}
            </Text>
            {key === 'average-apy' && isApyLoading ? (
              <Skeleton
                testID={AllocationDetailsTestIds.VALUE(key)}
                width="75"
                height={18}
                accessible={false}
                twClassName="ml-auto rounded-md"
              />
            ) : (
              <Text
                testID={AllocationDetailsTestIds.VALUE(key)}
                variant={TextVariant.BodyMd}
                color={color ?? TextColor.TextDefault}
                twClassName="flex-1 text-right"
                numberOfLines={1}
              >
                {value}
              </Text>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AllocationDetails;
