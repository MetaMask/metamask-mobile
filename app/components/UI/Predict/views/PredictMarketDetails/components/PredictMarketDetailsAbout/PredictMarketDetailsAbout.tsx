import React, { memo } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatVolume } from '../../../../utils/format';
import type { PredictMarket } from '../../../../types';

export interface PredictMarketDetailsAboutProps {
  market: PredictMarket | null;
  onPolymarketResolution: () => void;
}

interface AboutRowProps {
  icon: IconName;
  label: string;
  value?: string;
  children?: React.ReactNode;
}

// Label/value treatment matches the "Market details" rows on Token Details:
// a medium-weight alternative label against a regular default-color value.
const AboutRow = ({ icon, label, value, children }: AboutRowProps) => (
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
      <Icon name={icon} size={IconSize.Md} color={IconColor.IconAlternative} />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
    {children ?? (
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {value}
      </Text>
    )}
  </Box>
);

const PredictMarketDetailsAbout = memo(
  ({ market, onPolymarketResolution }: PredictMarketDetailsAboutProps) => (
    <Box twClassName="gap-6">
      <Box twClassName="gap-2">
        <AboutRow
          icon={IconName.Chart}
          label={strings('predict.market_details.volume')}
          value={`$${formatVolume(market?.outcomes[0].volume || 0)}`}
        />
        <AboutRow
          icon={IconName.Clock}
          label={strings('predict.market_details.end_date')}
          value={
            market?.endDate
              ? new Date(market?.endDate).toLocaleDateString()
              : 'N/A'
          }
        />
        <AboutRow
          icon={IconName.Bank}
          label={strings('predict.market_details.resolution_details')}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Pressable onPress={onPolymarketResolution}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.PrimaryDefault}
              >
                Polymarket
              </Text>
            </Pressable>
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={IconColor.PrimaryDefault}
            />
          </Box>
        </AboutRow>
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
  ),
);

PredictMarketDetailsAbout.displayName = 'PredictMarketDetailsAbout';

export default PredictMarketDetailsAbout;
