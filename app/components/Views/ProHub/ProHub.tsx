import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  IconName,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { ProHubTestIds } from './ProHub.testIds';

const ProHub = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleManagePress = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP as never);
  }, [navigation]);

  const handleExplorePress = useCallback(() => {
    // TODO: navigate to benefits / ProSubscription flow
  }, []);

  const handleManagePlans = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP as never);
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top']}
      testID={ProHubTestIds.CONTAINER}
    >
      {/* Header row */}
      <HeaderBase
        testID={ProHubTestIds.HEADER_ROOT}
        twClassName="pl-4 pr-3"
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={ProHubTestIds.BACK_BUTTON}
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Setting}
            onPress={handleManagePlans}
            accessibilityLabel="Manage Plans"
            testID={ProHubTestIds.MANAGE_PLANS_BUTTON}
          />
        }
      />

      {/* Content */}
      <Box twClassName="flex-1 px-6 pt-6 gap-y-2">
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          testID={ProHubTestIds.TITLE}
        >
          {strings('pro_hub.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={ProHubTestIds.SUBTITLE}
        >
          {strings('pro_hub.subtitle')}
        </Text>
      </Box>

      {/* Action buttons */}
      <Box twClassName="px-6 pb-10 gap-y-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleExplorePress}
          isFullWidth
          testID={ProHubTestIds.EXPLORE_BUTTON}
        >
          {strings('pro_hub.explore_benefits')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleManagePress}
          isFullWidth
          testID={ProHubTestIds.MANAGE_BUTTON}
        >
          {strings('pro_hub.manage')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default ProHub;
