import React, { useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import Logger from '../../../../../util/Logger';
import MoneyConvertStablecoins from '../../../Money/components/MoneyConvertStablecoins/MoneyConvertStablecoins';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../types/musd.types';
import type { AssetType } from '../../../../Views/confirmations/types/token';
import { AssetOverviewConvertSectionTestIds } from './AssetOverviewConvertSection.testIds';

/**
 * Convert section embedded in the mUSD asset detail page (MUSD-733). Wraps the
 * shared `MoneyConvertStablecoins` component and wires Max / edit row actions
 * to the existing conversion entry points.
 */
const AssetOverviewConvertSection = () => {
  const { tokens } = useMusdConversionTokens();
  const { initiateMaxConversion, initiateCustomConversion } =
    useMusdConversion();

  const handleMaxPress = useCallback(
    async (token: AssetType) => {
      try {
        await initiateMaxConversion(token);
      } catch (error) {
        Logger.error(error as Error, {
          message:
            '[AssetOverviewConvertSection] Failed to initiate max conversion',
        });
      }
    },
    [initiateMaxConversion],
  );

  const handleEditPress = useCallback(
    async (token: AssetType) => {
      try {
        await initiateCustomConversion({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
          navigationOverride: MUSD_CONVERSION_NAVIGATION_OVERRIDE.CUSTOM,
        });
      } catch (error) {
        Logger.error(error as Error, {
          message:
            '[AssetOverviewConvertSection] Failed to initiate custom conversion',
        });
      }
    },
    [initiateCustomConversion],
  );

  return (
    <Box testID={AssetOverviewConvertSectionTestIds.CONTAINER}>
      <MoneyConvertStablecoins
        tokens={tokens}
        onMaxPress={handleMaxPress}
        onEditPress={handleEditPress}
      />
    </Box>
  );
};

export default AssetOverviewConvertSection;
