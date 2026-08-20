import React from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PredictNextStackParamList } from '../../navigation/types';
import { PredictNextRoutes } from '../../navigation/routes';

export const PredictEventDetail = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { title } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextEventDetail'>>()
      .params;
  const handleBack = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.navigate(PredictNextRoutes.HOME);

  return (
    <Box twClassName="flex-1 gap-6 p-4 pt-12" testID="predict-next-detail">
      <Button
        testID="predict-next-detail-back"
        variant={ButtonVariant.Tertiary}
        onPress={handleBack}
      >
        Back
      </Button>
      <Text variant={TextVariant.HeadingLg}>{title}</Text>
    </Box>
  );
};
