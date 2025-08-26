import { useNavigation } from '@react-navigation/native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import React, { useCallback, useRef } from 'react';
import { RefreshControl, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import PredictPosition from '../../components/PredictPosition';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import type { Position } from '../../types';
import styleSheet from './PredictTabView.styles';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { positions, isRefreshing, loadPositions } = usePredictPositions({
    loadOnMount: true,
  });
  const listRef = useRef<FlashListRef<Position>>(null);

  const renderItem = useCallback(
    ({ item }: { item: Position }) => <PredictPosition position={item} />,
    [],
  );

  return (
    <View style={styles.wrapper}>
      <FlashList
        ref={listRef}
        data={positions}
        renderItem={renderItem}
        keyExtractor={(item) => item.conditionId}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadPositions({ isRefresh: true })}
          />
        }
        removeClippedSubviews
        decelerationRate={0}
      />
      <View style={styles.viewAllMarkets}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={() => navigation.navigate(Routes.PREDICT.MARKET_LIST)}
          label={strings('predict.view_available_markets')}
        />
      </View>
    </View>
  );
};

export default PredictTabView;
