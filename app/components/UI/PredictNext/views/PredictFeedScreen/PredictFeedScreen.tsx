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
import { getFeedScreen } from '../../navigation/feedScreens';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import { PredictFeedScreenTestIds } from './PredictFeedScreen.testIds';

export const PredictFeedScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { feedScreenId } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextFeed'>>().params;
  const definition = getFeedScreen(feedScreenId);

  const handleBack = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.navigate(PredictNextRoutes.HOME);

  if (!definition) {
    return (
      <Box
        testID={PredictFeedScreenTestIds.UNAVAILABLE}
        twClassName="flex-1 gap-6 p-4 pt-12"
      >
        <Button
          testID={PredictFeedScreenTestIds.BACK}
          variant={ButtonVariant.Tertiary}
          onPress={handleBack}
        >
          Back
        </Button>
        <Text>This feed is unavailable.</Text>
      </Box>
    );
  }

  return (
    <Box
      testID={PredictFeedScreenTestIds.VIEW}
      twClassName="flex-1 gap-3 p-4 pt-12"
    >
      <Button
        testID={PredictFeedScreenTestIds.BACK}
        variant={ButtonVariant.Tertiary}
        onPress={handleBack}
      >
        Back
      </Button>
      <Text variant={TextVariant.HeadingLg}>{definition.title}</Text>
      {definition.selectionLabel ? (
        <Text variant={TextVariant.HeadingMd}>{definition.selectionLabel}</Text>
      ) : null}
    </Box>
  );
};
