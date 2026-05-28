import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import QuickBuyRateTag from './QuickBuyRateTag';
import { useQuickBuyContext } from '../useQuickBuyContext';

const QuickBuyToolbar: React.FC = () => {
  const { formattedExchangeRate } = useQuickBuyContext();

  return (
    <Box
      twClassName="px-4 pt-2 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        twClassName="rounded-full bg-muted px-3 py-1"
        flexDirection={BoxFlexDirection.Row}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {strings('social_leaderboard.quick_buy.buy_mode')}
        </Text>
      </Box>

      <QuickBuyRateTag label={formattedExchangeRate} />
    </Box>
  );
};

export default QuickBuyToolbar;
