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
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { ProHubTestIds } from './ProHub.testIds';

const ProHub = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleManageMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP);
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'bottom']}
      testID={ProHubTestIds.CONTAINER}
    >
      {/* Header row */}
      <HeaderBase
        testID={ProHubTestIds.HEADER_ROOT}
        twClassName="px-4"
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
            onPress={handleManageMembership}
            accessibilityLabel={strings('pro_hub.manage')}
            testID={ProHubTestIds.MANAGE_PLANS_BUTTON}
          />
        }
      />

      {/* Content */}
      <Box twClassName="flex-1 px-4 pt-2 gap-y-2">
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
      <Box twClassName="px-4 pb-2 gap-y-4">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleManageMembership}
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
