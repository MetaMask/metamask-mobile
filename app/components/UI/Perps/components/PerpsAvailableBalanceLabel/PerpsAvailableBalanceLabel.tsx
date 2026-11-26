import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { PERPS_AVAILABLE_BALANCE_LOGO_SIZE } from '../../constants/perpsUIConfig';
import { usePerpsProviderLogoIds } from '../../hooks/usePerpsProviderLogoIds';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../Perps.testIds';
import { formatPerpsBalance } from '../../utils/formatUtils';
import PerpsProviderLogos from '../PerpsProviderLogos';

export interface PerpsAvailableBalanceLabelProps {
  spendableBalance: string;
  isHidden: boolean;
  variant: TextVariant;
  twClassName?: string;
}

/**
 * "$X available" with the active exchange marks. Shared by Perps home and the
 * market balance actions row so the two layouts cannot drift.
 */
const PerpsAvailableBalanceLabel: React.FC<PerpsAvailableBalanceLabelProps> = ({
  spendableBalance,
  isHidden,
  variant,
  twClassName,
}) => {
  const providerLogoIds = usePerpsProviderLogoIds();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      testID={PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_ROW}
      className={twClassName}
    >
      {providerLogoIds.length > 0 ? (
        <PerpsProviderLogos
          providerIds={providerLogoIds}
          size={PERPS_AVAILABLE_BALANCE_LOGO_SIZE}
          className="mr-1"
        />
      ) : null}
      <SensitiveText
        variant={variant}
        color={TextColor.TextAlternative}
        isHidden={isHidden}
        length={SensitiveTextLength.Short}
        testID={PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_TEXT}
      >
        {formatPerpsBalance(spendableBalance)}
      </SensitiveText>
      <Text
        variant={variant}
        color={TextColor.TextAlternative}
        testID={PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_SUFFIX}
      >
        {' '}
        {strings('perps.available')}
      </Text>
    </Box>
  );
};

export default PerpsAvailableBalanceLabel;
