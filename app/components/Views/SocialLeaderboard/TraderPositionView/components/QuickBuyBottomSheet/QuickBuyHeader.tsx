import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName as DsIconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../../locales/i18n';
import { formatCompactUsd } from '../../../../../UI/Rewards/utils/formatUtils';
import PositionTokenAvatar from '../../../components/PositionTokenAvatar';
import QuickBuyRateTag from './components/QuickBuyRateTag';

interface QuickBuyHeaderProps {
  position: Position;
  marketCap?: number;
  onClose: () => void;
  formattedRate?: string;
  isRateLoading: boolean;
  onRatePress: () => void;
}

const QuickBuyHeader: React.FC<QuickBuyHeaderProps> = ({
  position,
  marketCap,
  onClose,
  formattedRate,
  isRateLoading,
  onRatePress,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={4}
    twClassName="h-20 px-4"
  >
    <Box twClassName="pb-1">
      <PositionTokenAvatar position={position} showChainBadge />
    </Box>
    <Box twClassName="flex-1">
      <Text
        variant={TextVariant.HeadingSm}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
      >
        {strings('social_leaderboard.quick_buy.title', {
          symbol: position.tokenSymbol,
        })}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {marketCap != null
          ? `${formatCompactUsd(marketCap)} ${strings('social_leaderboard.quick_buy.market_cap_label')}`
          : strings('social_leaderboard.quick_buy.market_cap_label')}
      </Text>
    </Box>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.End}
      gap={2}
    >
      <QuickBuyRateTag
        formattedRate={formattedRate}
        isLoading={isRateLoading}
        onPress={onRatePress}
      />
      <ButtonIcon
        iconName={DsIconName.Close}
        size={ButtonIconSize.Md}
        onPress={onClose}
        testID="quick-buy-close-button"
      />
    </Box>
  </Box>
);

export default QuickBuyHeader;
