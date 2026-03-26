import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName as CLIconName,
  IconSize as CLIconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import {
  TextColor as CLTextColor,
  TextVariant as CLTextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../../component-library/components/Texts/SensitiveText';
import { TronStakingRewardsRowsTestIds } from './TronStakingRewardsRows.testIds';

const ICON_CIRCLE_TW =
  'h-10 w-10 rounded-full bg-muted mr-4 items-center justify-center';

export interface TronEstimatedAnnualRewardsRowProps {
  title: string;
  subtitle: string;
  hideBalances: boolean;
}

const TronEstimatedAnnualRewardsRow = ({
  title,
  subtitle,
  hideBalances,
}: TronEstimatedAnnualRewardsRowProps) => (
  <Box
    testID={TronStakingRewardsRowsTestIds.ESTIMATED_ANNUAL_ROW}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    paddingTop={3}
    paddingBottom={3}
  >
    <Box twClassName={ICON_CIRCLE_TW}>
      <Icon name={CLIconName.Calendar} size={CLIconSize.Md} />
    </Box>
    <Box twClassName="flex-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {title}
      </Text>
      <SensitiveText
        variant={CLTextVariant.BodySM}
        color={CLTextColor.Alternative}
        isHidden={hideBalances}
        length={SensitiveTextLength.Medium}
        testID={TronStakingRewardsRowsTestIds.ESTIMATED_SUBTITLE}
      >
        {subtitle}
      </SensitiveText>
    </Box>
  </Box>
);

export default TronEstimatedAnnualRewardsRow;
