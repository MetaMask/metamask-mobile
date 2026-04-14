import React, { useEffect, useMemo } from 'react';
import { Image, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BenefitFullViewRouteProp } from './BenefitFullView.types.ts';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants.ts';
import { formatDateRemaining } from '../utils/formatUtils.ts';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import Routes from '../../../../constants/navigation/Routes.ts';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import Engine from '../../../../core/Engine';

const BenefitFullView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute<BenefitFullViewRouteProp>();
  const { benefit } = route.params;
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  useEffect(() => {
    if (!subscriptionId) return;
    Engine.controllerMessenger
      .call(
        'RewardsController:postBenefitImpression',
        subscriptionId,
        benefit.id,
        benefit.type.id,
      )
      .catch();
  }, [benefit, subscriptionId]);

  const handleClaim = () => {
    if (benefit.url) {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: benefit.url,
          timestamp: Date.now(),
          fromBenefit: true,
        },
      });
    }
  };

  const remainingTime = useMemo(
    () =>
      benefit.actionDate == null
        ? null
        : formatDateRemaining(benefit.actionDate, Date.now()),
    [benefit.actionDate],
  );

  return (
    <ErrorBoundary navigation={navigation} view="BenefitFullView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1')}
        testID={REWARDS_VIEW_SELECTORS.DETAIL_BENEFIT_VIEW}
      >
        <HeaderCompactStandard
          title={strings('rewards.benefits.title_claim')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-6')}
        >
          <Box twClassName="w-full rounded-lg overflow-hidden">
            <Image
              source={{ uri: benefit.thumbnail }}
              style={tw.style('w-full h-[248px]')}
              resizeMode="cover"
              testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE}
            />
          </Box>
          <Box>
            <Text
              color={TextColor.TextDefault}
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
            >
              {benefit.longTitle}
            </Text>
            {remainingTime != null && (
              <Box
                marginTop={1}
                marginBottom={2}
                gap={1}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
              >
                <Icon
                  name={IconName.Clock}
                  size={IconSize.Md}
                  color={IconColor.IconAlternative}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {remainingTime}
                </Text>
              </Box>
            )}
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {benefit.longDescription}
            </Text>
          </Box>
        </ScrollView>
        <Box paddingTop={4} paddingHorizontal={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleClaim}
            endIconName={IconName.Export}
            twClassName="w-full"
            testID={REWARDS_VIEW_SELECTORS.DETAIL_BENEFIT_ACTION}
          >
            {strings('rewards.benefits.action')}
          </Button>
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default BenefitFullView;
