import React from 'react';
import { FlatList, Image, ImageSourcePropType } from 'react-native';
import {
  Box,
  Text,
  ButtonBase,
  Icon,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  TextColor,
  IconName,
  IconSize,
  IconColor,
  ButtonVariant,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import { SwapSupportedNetworksSection } from './SwapSupportedNetworksSection';
import MetamaskRewardsPointsImage from '../../../../../../../images/rewards/metamask-rewards-points.svg';
import swapIllustration from '../../../../../../../images/rewards/rewards-swap.png';
import perpIllustration from '../../../../../../../images/rewards/rewards-trade.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ModalType } from '../../../../components/RewardsBottomSheetModal';

export enum WayToEarnType {
  SWAPS = 'swaps',
  PERPS = 'perps',
  REFERRALS = 'referrals',
}

interface WayToEarn {
  type: WayToEarnType;
  title: string;
  description: string;
  icon: string;
}

const waysToEarn: WayToEarn[] = [
  {
    type: WayToEarnType.SWAPS,
    title: strings('rewards.ways_to_earn.swap.title'),
    description: strings('rewards.ways_to_earn.swap.points'),
    icon: IconName.SwapVertical,
  },
  {
    type: WayToEarnType.PERPS,
    title: strings('rewards.ways_to_earn.perps.title'),
    description: strings('rewards.ways_to_earn.perps.points'),
    icon: IconName.Candlestick,
  },
  {
    type: WayToEarnType.REFERRALS,
    title: strings('rewards.ways_to_earn.referrals.title'),
    description: strings('rewards.ways_to_earn.referrals.points'),
    icon: IconName.UserCircleAdd,
  },
];

const Separator = () => <Box twClassName="border-b border-muted" />;

const WaysToEarnSheetTitle = ({
  title,
  points,
  illustration,
}: {
  title: string;
  points: string;
  illustration: ImageSourcePropType;
}) => {
  const tw = useTailwind();
  return (
    <Box
      twClassName="w-full flex-row"
      justifyContent={BoxJustifyContent.Between}
    >
      {/* Title and points */}
      <Box twClassName="gap-4">
        <Text variant={TextVariant.HeadingLg}>{title}</Text>
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
      {/* Illustration */}
      <Image
        source={illustration}
        resizeMode="contain"
        style={tw.style('h-16 w-16')}
      />
    </Box>
  );
};

const getBottomSheetData = (type: WayToEarnType) => {
  switch (type) {
    case WayToEarnType.SWAPS:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.swap.title')}
            points={strings('rewards.ways_to_earn.swap.points')}
            illustration={swapIllustration}
          />
        ),
        description: (
          <Box twClassName="flex flex-col gap-6 mt-4">
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {strings('rewards.ways_to_earn.swap.sheet_description')}
            </Text>
            <SwapSupportedNetworksSection />
          </Box>
        ),
      };
    case WayToEarnType.PERPS:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.perps.sheet_title')}
            points={strings('rewards.ways_to_earn.perps.points')}
            illustration={perpIllustration}
          />
        ),
        description: (
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.ways_to_earn.perps.sheet_description')}
          </Text>
        ),
      };
    default:
      throw new Error(`Unknown earning way type: ${type}`);
  }
};

export const WaysToEarn = () => {
  const navigation = useNavigation();

  const handleCTAPress = async (type: WayToEarnType) => {
    navigation.goBack(); // Close the modal first

    if (type === WayToEarnType.SWAPS) {
      navigation.navigate(Routes.SWAPS);
    } else if (type === WayToEarnType.PERPS) {
      navigation.navigate(Routes.PERPS.ROOT);
    }
  };

  const handleEarningWayPress = (wayToEarn: WayToEarn) => {
    switch (wayToEarn.type) {
      case WayToEarnType.SWAPS:
      case WayToEarnType.PERPS: {
        const modalData = getBottomSheetData(wayToEarn.type);
        navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
          title: modalData.title,
          description: modalData.description,
          showIcon: false,
          type: ModalType.Confirmation,
          confirmAction: {
            label:
              wayToEarn.type === WayToEarnType.SWAPS
                ? strings('rewards.ways_to_earn.swap.cta_label')
                : strings('rewards.ways_to_earn.perps.cta_label'),
            onPress: () => {
              handleCTAPress(wayToEarn.type);
            },
            variant: ButtonVariant.Primary,
          },
          showCancelButton: false,
        });
        break;
      }
      case WayToEarnType.REFERRALS:
        navigation.navigate(Routes.REFERRAL_REWARDS_VIEW);
        break;
    }
  };

  return (
    <Box twClassName="py-4">
      <Text variant={TextVariant.HeadingMd} twClassName="mb-4">
        {strings('rewards.ways_to_earn.title')}
      </Text>

      <Box twClassName="rounded-xl bg-muted">
        <FlatList
          horizontal={false}
          data={waysToEarn}
          keyExtractor={(wayToEarn) => wayToEarn.title}
          ItemSeparatorComponent={Separator}
          scrollEnabled={false}
          renderItem={({ item: wayToEarn }) => (
            <ButtonBase
              twClassName="h-16 px-4 py-4 bg-inherit"
              onPress={() => handleEarningWayPress(wayToEarn)}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-1"
              >
                <Box twClassName="mr-3 h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Icon
                    color={IconColor.IconAlternative}
                    name={wayToEarn.icon as IconName}
                    size={IconSize.Lg}
                  />
                </Box>

                <Box>
                  <Text variant={TextVariant.SectionHeading}>
                    {wayToEarn.title}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {wayToEarn.description}
                  </Text>
                </Box>
              </Box>

              <Icon name={IconName.ArrowRight} size={IconSize.Md} />
            </ButtonBase>
          )}
        />
      </Box>
    </Box>
  );
};
