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
} from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../../locales/i18n';
import { formatCompactUsd } from '../../../../../UI/Rewards/utils/formatUtils';
import PositionTokenAvatar from '../../../components/PositionTokenAvatar';

interface QuickBuyHeaderProps {
  position: Position;
  marketCap?: number;
  onClose: () => void;
}

const QuickBuyHeader: React.FC<QuickBuyHeaderProps> = ({
  position,
  marketCap,
  onClose,
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
    <ButtonIcon
      iconName={DsIconName.Close}
      size={ButtonIconSize.Md}
      onPress={onClose}
      testID="quick-buy-close-button"
    />
  </Box>
);

export default QuickBuyHeader;
