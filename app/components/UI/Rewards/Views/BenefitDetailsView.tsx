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
import { BenefitDetailsViewRouteProp } from './BenefitDetailsView.types.ts';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants.ts';
import { formatDateRemaining } from '../utils/formatUtils.ts';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import Routes from '../../../../constants/navigation/Routes.ts';
import { useBenefits } from '../hooks/useBenefits.ts';

const BenefitDetailsView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute<BenefitDetailsViewRouteProp>();
  const { benefit } = route.params;

  const { postImpression } = useBenefits();

  useEffect(() => {
    postImpression(benefit).then();
  }, [benefit, postImpression]);

  const handleClaim = () => {
    if (benefit.url) {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: benefit.url,
          timestamp: Date.now(),
          fromTrending: true,
        },
      });
    }
  };

  const remainingTime = useMemo(() => {
    if (benefit.actionDate == null) {
      return null;
    }
    return formatDateRemaining(benefit.actionDate);
  }, [benefit]);

  return (
    <ErrorBoundary navigation={navigation} view="BenefitDetailsView">
      <SafeAreaView
        edges={{}}
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
          contentContainerStyle={tw.style('flex-1 px-4 gap-6')}
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
            {remainingTime && (
              <Box
                twClassName="gap-1 mt-1 mb-2"
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
        <Box twClassName="p-4">
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

export default BenefitDetailsView;
