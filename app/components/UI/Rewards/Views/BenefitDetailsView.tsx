import React from 'react';
import { Image, Linking, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection, Button, ButtonSize, ButtonVariant,
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
import { formatDayHourRemaining } from '../utils/formatUtils.ts';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';

const BenefitDetailsView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute<BenefitDetailsViewRouteProp>();
  const { colors } = useTheme();

  const { benefit } = route.params;

  const handleClaim = () => {
    if (benefit.url) {
      Linking.openURL(benefit.url);
    }
  };

  return (
    <ErrorBoundary navigation={navigation} view="BenefitDetailsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
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
          contentContainerStyle={tw.style('px-4 pb-24')}
        >
          <Box twClassName="w-full rounded-lg overflow-hidden">
            <Image
              source={{ uri: benefit.thumbnail }}
              style={tw.style('w-full h-[248px]')}
              resizeMode="cover"
              testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE}
            />
          </Box>
          <Box twClassName="py-6">
            <Text
              color={TextColor.TextDefault}
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
            >
              {benefit.longTitle}
            </Text>
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
                {formatDayHourRemaining(benefit.actionDate)}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {benefit.longDescription}
            </Text>
          </Box>
        </ScrollView>
        <Box twClassName="absolute bottom-0 left-0 right-0 p-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleClaim}
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
