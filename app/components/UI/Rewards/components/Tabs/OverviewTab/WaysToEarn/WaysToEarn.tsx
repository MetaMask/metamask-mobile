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
  IconSize,
  IconColor,
  ButtonVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import { SwapSupportedNetworksSection } from './SwapSupportedNetworksSection';
import ReferralStatsSummary from '../../../ReferralDetails/ReferralStatsSummary';
import MetamaskRewardsPointsImage from '../../../../../../../images/rewards/metamask-rewards-points.svg';
import { ModalType } from '../../../../components/RewardsBottomSheetModal';
import { useSelector } from 'react-redux';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../../hooks/useMetrics';
import { RewardsMetricsButtons } from '../../../../utils';
import { selectSeasonWaysToEarn } from '../../../../../../../reducers/rewards/selectors';
import { getIconName } from '../../../../utils/formatUtils';
import { SeasonWayToEarnDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';
import { handleDeeplink } from '../../../../../../../core/DeeplinkManager';

const Separator = () => <Box twClassName="border-b border-muted" />;

const WaysToEarnSheetTitle = ({
  title,
  points,
}: {
  title: string;
  points: string;
}) => (
  <>
    <Text variant={TextVariant.HeadingLg}>{title}</Text>
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="bg-muted px-2 mt-2 py-1 rounded-md gap-1"
      alignItems={BoxAlignItems.Center}
    >
      <MetamaskRewardsPointsImage
        width={16}
        height={16}
        name="MetamaskRewardsPoints"
      />
      <Text variant={TextVariant.BodySm}>{points}</Text>
    </Box>
  </>
);

const getBottomSheetData = (wayToEarn: SeasonWayToEarnDto) => ({
  title: (
    <WaysToEarnSheetTitle
      title={wayToEarn.bottomSheetTitle}
      points={wayToEarn.pointsEarningRule}
    />
  ),
  description: (
    <Box twClassName="flex flex-col gap-8">
      <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
        {wayToEarn.description}
      </Text>
      {wayToEarn.specificContent &&
        'supportedNetworks' in wayToEarn.specificContent && (
          <SwapSupportedNetworksSection {...wayToEarn.specificContent} />
        )}
      {wayToEarn.specificContent &&
        'referralPointsTitle' in wayToEarn.specificContent && (
          <ReferralStatsSummary {...wayToEarn.specificContent} />
        )}
    </Box>
  ),
  ctaLabel: wayToEarn.buttonLabel,
});

export const WaysToEarn = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const seasonWaysToEarn = useSelector(selectSeasonWaysToEarn);

  const handleCTAPress = async (wayToEarn: SeasonWayToEarnDto) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED)
        .addProperties({
          ways_to_earn_type: wayToEarn.type,
        })
        .build(),
    );
    navigation.goBack(); // Close the modal first

    const { deeplink, url, route } = wayToEarn.buttonAction || {};
    const { root, screen } = route || {};

    // Handle deeplink, route name and url in order
    if (deeplink) {
      handleDeeplink({ uri: deeplink });
    } else if (root) {
      navigation.navigate(root, screen ? { screen } : undefined);
    } else if (url) {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: url,
          timestamp: Date.now(),
        },
      });
    }
  };

  const handleEarningWayPress = (wayToEarn: SeasonWayToEarnDto) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          button_type: RewardsMetricsButtons.WAYS_TO_EARN,
          ways_to_earn_type: wayToEarn.type,
        })
        .build(),
    );

    const { title, description, ctaLabel } = getBottomSheetData(wayToEarn);
    navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
      title,
      description,
      showIcon: false,
      type: ModalType.Confirmation,
      confirmAction: {
        label: ctaLabel,
        onPress: () => {
          handleCTAPress(wayToEarn);
        },
        variant: ButtonVariant.Primary,
      },
      showCancelButton: false,
    });
  };

  return (
    <Box twClassName="p-4">
      <Text variant={TextVariant.HeadingMd} twClassName="mb-4">
        {strings('rewards.ways_to_earn.title')}
      </Text>

      <Box twClassName="rounded-xl bg-muted">
        <FlatList
          horizontal={false}
          data={seasonWaysToEarn}
          keyExtractor={(wayToEarn) => wayToEarn.id}
          ItemSeparatorComponent={Separator}
          scrollEnabled={false}
          renderItem={({ item: wayToEarn }) => (
            <ButtonBase
              twClassName="h-auto px-4 py-3 bg-inherit"
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
                    name={getIconName(wayToEarn.icon)}
                    size={IconSize.Lg}
                  />
                </Box>

                <Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {wayToEarn.title}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {wayToEarn.shortDescription}
                  </Text>
                </Box>
              </Box>
            </ButtonBase>
          )}
        />
      </Box>
    </Box>
  );
};
