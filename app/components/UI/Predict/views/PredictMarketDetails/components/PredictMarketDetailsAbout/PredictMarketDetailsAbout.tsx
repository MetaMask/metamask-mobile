import React, { memo } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../../util/theme';
import { formatVolume } from '../../../../utils/format';
import type { PredictMarket } from '../../../../types';

export interface PredictMarketDetailsAboutProps {
  market: PredictMarket | null;
  onPolymarketResolution: () => void;
}

const PredictMarketDetailsAbout = memo(
  ({ market, onPolymarketResolution }: PredictMarketDetailsAboutProps) => {
    const { colors } = useTheme();

    return (
      <Box twClassName="gap-6">
        <Box twClassName="gap-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="gap-3"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              <Icon
                name={IconName.Chart}
                size={IconSize.Md}
                color={colors.text.muted}
              />
              <Text
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
                color={TextColor.TextDefault}
              >
                {strings('predict.market_details.volume')}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              ${formatVolume(market?.outcomes[0].volume || 0)}
            </Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="gap-3"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              <Icon
                name={IconName.Clock}
                size={IconSize.Md}
                color={colors.text.muted}
              />
              <Text
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
                color={TextColor.TextDefault}
              >
                {strings('predict.market_details.end_date')}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {market?.endDate
                ? new Date(market?.endDate).toLocaleDateString()
                : 'N/A'}
            </Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="gap-3"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              <Icon
                name={IconName.Bank}
                size={IconSize.Md}
                color={colors.text.muted}
              />
              <Text
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
                color={TextColor.TextDefault}
              >
                {strings('predict.market_details.resolution_details')}
              </Text>
            </Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <Pressable onPress={onPolymarketResolution}>
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="font-medium"
                  color={TextColor.PrimaryDefault}
                >
                  Polymarket
                </Text>
              </Pressable>
              <Icon
                name={IconName.Export}
                size={IconSize.Sm}
                color={colors.primary.default}
              />
            </Box>
          </Box>
        </Box>
        <Box twClassName="w-full border-t border-muted" />
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {market?.description}
        </Text>
        <Box twClassName="w-full border-t border-muted" />
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings('predict.market_details.disclaimer')}
        </Text>
      </Box>
    );
  },
);

PredictMarketDetailsAbout.displayName = 'PredictMarketDetailsAbout';

export default PredictMarketDetailsAbout;
