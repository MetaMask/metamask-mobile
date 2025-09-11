import React, { useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './WaysToEarnSheet.styles';
import { strings } from '../../../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import MetamaskRewardsPointsImage from '../../../../../../images/metamask-rewards-points.svg';
import SupportedNetworksSection from './SupportedNetworksSection';
import { Image, ImageSourcePropType } from 'react-native';
import swapIllustration from '../../../../../../images/rewards/rewards-swap.png';
import perpIllustration from '../../../../../../images/rewards/rewards-trade.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { EarningWayId } from './WaysToEarn';

export const RewardsWaysToEarnSwap = () => {
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);

  interface WaysToEarnSwapParams {
    earningWayId: string;
  }

  const params = useParams<WaysToEarnSwapParams>();

  const renderSupportedNetworksSection = () => <SupportedNetworksSection />;

  const getEarningWayContent = (
    earningWayId: string,
  ): {
    title: string;
    description: string;
    points: string;
    illustration: ImageSourcePropType;
    children?: React.ReactNode;
  } => {
    switch (earningWayId) {
      case EarningWayId.SWAPS:
        return {
          title: strings('rewards.ways_to_earn.swap.title'),
          description: strings('rewards.ways_to_earn.swap.sheet_description'),
          points: strings('rewards.ways_to_earn.swap.points'),
          illustration: swapIllustration,
          children: renderSupportedNetworksSection(),
        };
      case EarningWayId.PERPS:
        return {
          title: strings('rewards.ways_to_earn.perps.sheet_title'),
          description: strings('rewards.ways_to_earn.perps.sheet_description'),
          points: strings('rewards.ways_to_earn.perps.points'),
          illustration: perpIllustration,
        };
      default:
        throw new Error(`Unknown earning way id: ${earningWayId}`);
    }
  };

  const { title, description, points, illustration, children } =
    getEarningWayContent(params.earningWayId);

  return (
    <BottomSheet
      style={styles.bottomSheetContent}
      ref={sheetRef}
      keyboardAvoidingViewEnabled={false}
    >
      {/* BottomSheet container */}
      <Box alignItems={BoxAlignItems.Start} twClassName="p-4 gap-4">
        {/* Swap title, points and illustration */}
        <Box
          twClassName="w-full flex-row"
          justifyContent={BoxJustifyContent.Between}
        >
          {/* Swap title and points */}
          <Box twClassName="gap-4">
            <Text variant={TextVariant.HeadingMd}>{title}</Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="bg-muted px-2 py-1 rounded-md gap-1"
              alignItems={BoxAlignItems.Center}
            >
              <MetamaskRewardsPointsImage
                width={16}
                height={16}
                name="MetamaskRewardsPoints"
              />
              <Text variant={TextVariant.BodySm}>{points}</Text>
            </Box>
          </Box>
          {/* Swap illustration */}
          <Image
            source={illustration}
            resizeMode="contain"
            style={tw.style('h-16 w-16')}
          />
        </Box>
        <Text color={TextColor.TextAlternative}>{description}</Text>
        {children}
      </Box>
    </BottomSheet>
  );
};
