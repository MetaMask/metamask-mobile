import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';

export function BatchSellReview() {
  const navigation = useNavigation();
  const tw = useTailwind();

  useEffect(() => {
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title: '',
        onBack: () => navigation.goBack(),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')} edges={['bottom']}>
      <Box
        testID={BatchSellReviewSelectorsIDs.CONTAINER}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 px-4 py-4"
      >
        <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
          {strings('bridge.batch_sell_review_title')}
        </Text>
      </Box>
    </SafeAreaView>
  );
}
