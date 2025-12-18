import React, { useCallback } from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

const BasicFunctionalityEmptyState = () => {
  const navigation = useNavigation();

  const handleEnableBasicFunctionality = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }, [navigation]);

  return (
    <Box
      testID="basic-functionality-empty-state"
      twClassName="flex-col pt-9 pb-24 justify-center items-center gap-3 flex-1"
    >
      <Box twClassName="flex-col w-[337px] items-stretch">
        <Text
          variant={TextVariant.HeadingSm}
          twClassName="text-default text-center self-stretch mb-2"
        >
          {strings('trending.basic_functionality_disabled_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-alternative text-center self-stretch font-medium"
        >
          {strings('trending.basic_functionality_disabled_description')}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          twClassName="self-stretch mt-6"
          onPress={handleEnableBasicFunctionality}
        >
          {strings('trending.enable_basic_functionality')}
        </Button>
      </Box>
    </Box>
  );
};

export default BasicFunctionalityEmptyState;
