import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  default as React,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { RefreshControl, View } from 'react-native';
import type { TabRefreshHandle } from '../../../../Views/Wallet/types';
import {
  PredictHomePositions,
  PredictHomePositionsHandle,
} from '../../components/PredictHome';
import PredictAddFundsSheet from '../../components/PredictAddFundsSheet/PredictAddFundsSheet';
import PredictOffline from '../../components/PredictOffline';
import { PredictTabViewSelectorsIDs } from '../../Predict.testIds';
import ConditionalScrollView from '../../../../../component-library/components-temp/ConditionalScrollView';
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

interface PredictTabViewProps {
  isVisible?: boolean;
}

const PredictTabView = forwardRef<TabRefreshHandle, PredictTabViewProps>(
  ({ isVisible }, ref) => {
    const tw = useTailwind();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const homePositionsRef = useRef<PredictHomePositionsHandle>(null);

    usePredictMeasurement({
      traceName: TraceName.PredictTabView,
      conditions: [!error, !isRefreshing, isVisible === true],
      debugContext: {
        hasErrors: !!error,
        isRefreshing,
      },
    });

    const handleRefresh = useCallback(async () => {
      setIsRefreshing(true);
      setError(null);
      try {
        await homePositionsRef.current?.refresh();
      } finally {
        setIsRefreshing(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      refresh: handleRefresh,
    }));

    const handleError = useCallback((err: string | null) => {
      setError(err);
    }, []);

    const content = (
      <>
        <PredictHomePositions
          ref={homePositionsRef}
          isVisible={isVisible}
          onError={handleError}
        />
        <PredictAddFundsSheet />
      </>
    );

    return (
      <View
        style={tw.style('bg-default')}
        testID={PredictTabViewSelectorsIDs.SCROLL_VIEW}
      >
        {error ? (
          <PredictOffline onRetry={handleRefresh} />
        ) : (
          <ConditionalScrollView
            isScrollEnabled={false}
            scrollViewProps={{
              refreshControl: (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                />
              ),
            }}
          >
            {content}
          </ConditionalScrollView>
        )}
      </View>
    );
  },
);

PredictTabView.displayName = 'PredictTabView';

export default PredictTabView;
