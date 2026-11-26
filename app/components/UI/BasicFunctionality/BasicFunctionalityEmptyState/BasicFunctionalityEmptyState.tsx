import React, { useCallback } from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';

interface BasicFunctionalityEmptyStateProps {
  title?: string;
  iconName?: IconName;
}

const BasicFunctionalityEmptyState = ({
  title,
  iconName,
}: BasicFunctionalityEmptyStateProps) => {
  const navigation = useNavigation<AppNavigationProp>();

  const handleEnableBasicFunctionality = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }, [navigation]);

  return (
    <Box
      testID="basic-functionality-empty-state"
      className="flex-col justify-center items-center gap-3 flex-1"
    >
      <Box className="flex-col w-[337px] items-stretch">
        {iconName && (
          <Box
            className="items-center mb-4"
            testID="basic-functionality-empty-state-icon-container"
          >
            <Icon
              name={iconName}
              color={IconColor.IconMuted}
              size={IconSize.Xl}
            />
          </Box>
        )}
        <Text
          variant={TextVariant.HeadingSm}
          className="text-default text-center self-stretch mb-2"
        >
          {title || strings('trending.basic_functionality_disabled_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          className="text-alternative text-center self-stretch font-medium"
        >
          {strings('trending.basic_functionality_disabled_description')}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          className="self-stretch mt-6"
          onPress={handleEnableBasicFunctionality}
        >
          {strings('trending.enable_basic_functionality')}
        </Button>
      </Box>
    </Box>
  );
};

export default BasicFunctionalityEmptyState;
