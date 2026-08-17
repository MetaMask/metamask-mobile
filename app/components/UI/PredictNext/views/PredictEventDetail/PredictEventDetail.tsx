import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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
import { PredictMarketChartPrototypeDemo } from '../../components/PredictMarketChartPrototype';

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 24,
  },
});

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
    <Box twClassName="flex-1 pt-12" testID="predict-next-detail">
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          testID="predict-next-detail-back"
          variant={ButtonVariant.Tertiary}
          onPress={handleBack}
        >
          Back
        </Button>
        <Text variant={TextVariant.HeadingLg}>{title}</Text>
        {__DEV__ ? <PredictMarketChartPrototypeDemo /> : null}
      </ScrollView>
    </Box>
  );
};
