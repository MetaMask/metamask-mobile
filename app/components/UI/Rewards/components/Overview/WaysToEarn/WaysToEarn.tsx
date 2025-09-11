import React from 'react';
import { FlatList } from 'react-native';
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
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { createWaysToEarnSwapSheetNavDetails } from './WaysToEarnSwapSheetCreator';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';

interface EarningWay {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export enum EarningWayId {
  SWAPS = 'swaps',
  PERPS = 'perps',
  REFERRALS = 'referrals',
}

const earningWays: EarningWay[] = [
  {
    id: EarningWayId.SWAPS,
    title: strings('rewards.ways_to_earn.swap.title'),
    description: strings('rewards.ways_to_earn.swap.points'),
    icon: IconName.SwapVertical,
  },
  {
    id: EarningWayId.PERPS,
    title: strings('rewards.ways_to_earn.perps.title'),
    description: strings('rewards.ways_to_earn.perps.points'),
    icon: IconName.Candlestick,
  },
  {
    id: EarningWayId.REFERRALS,
    title: strings('rewards.ways_to_earn.referrals.title'),
    description: strings('rewards.ways_to_earn.referrals.points'),
    icon: IconName.UserCircleAdd,
  },
];

const Separator = () => <Box twClassName="border-b border-muted" />;

export const WaysToEarn = () => {
  const navigation = useNavigation();

  const handleEarningWayPress = (item: EarningWay) => {
    switch (item.id) {
      case EarningWayId.SWAPS:
      case EarningWayId.PERPS: {
        const [routeName, params] = createWaysToEarnSwapSheetNavDetails({
          earningWayId: item.id,
        });
        navigation.navigate(routeName, params);
        break;
      }
      case EarningWayId.REFERRALS:
        navigation.navigate(Routes.REFERRAL_REWARDS_VIEW);
        break;
    }
  };

  return (
    <Box>
      <Text variant={TextVariant.HeadingMd} twClassName="mb-4">
        Ways to earn
      </Text>

      <Box twClassName="rounded-xl bg-muted">
        <FlatList
          horizontal={false}
          data={earningWays}
          keyExtractor={(item) => item.title}
          ItemSeparatorComponent={Separator}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <ButtonBase
              twClassName="h-16 px-4 py-4 bg-inherit"
              onPress={() => handleEarningWayPress(item)}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-1"
              >
                <Box twClassName="mr-3 h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Icon
                    color={IconColor.IconAlternative}
                    name={item.icon as IconName}
                    size={IconSize.Md}
                  />
                </Box>

                <Box>
                  <Text variant={TextVariant.SectionHeading}>{item.title}</Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {item.description}
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
