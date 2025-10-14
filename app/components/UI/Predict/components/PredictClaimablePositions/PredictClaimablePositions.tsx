import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { default as React, useCallback } from 'react';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import PredictPositionResolved from '../../components/PredictPositionResolved';
import { usePredictClaimablePositions } from '../../hooks/usePredictClaimablePositions';
import { PredictPosition as PredictPositionType } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';

const PredictClaimablePositions = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { positions } = usePredictClaimablePositions({
    loadOnMount: true,
  });

  const renderResolvedPosition = useCallback(
    ({ item }: { item: PredictPositionType }) => (
      <PredictPositionResolved
        position={item}
        onPress={() => {
          navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              marketId: item.marketId,
              headerShown: false,
            },
          });
        }}
      />
    ),
    [navigation],
  );

  if (positions.length === 0) {
    return null;
  }

  return (
    <>
      <Box>
        <Text variant={TextVariant.BodyMd} twClassName="text-alternative mb-4">
          {strings('predict.tab.resolved_markets')}
        </Text>
      </Box>
      <FlashList
        data={positions.sort(
          (a, b) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
        )}
        renderItem={renderResolvedPosition}
        scrollEnabled={false}
        keyExtractor={(item) => `${item.outcomeId}:${item.outcomeIndex}`}
      />
    </>
  );
};

export default PredictClaimablePositions;
