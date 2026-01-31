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
import { useSelector } from 'react-redux';
import PredictPositionsHeader, {
  PredictPositionsHeaderHandle,
} from '../../components/PredictPositionsHeader';
import PredictPositions, {
  PredictPositionsHandle,
} from '../../components/PredictPositions/PredictPositions';
import PredictAddFundsSheet from '../../components/PredictAddFundsSheet/PredictAddFundsSheet';
import PredictOffline from '../../components/PredictOffline';
import { PredictTabViewSelectorsIDs } from '../../Predict.testIds';
import { selectHomepageRedesignV1Enabled } from '../../../../../selectors/featureFlagController/homepage';
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
    const [positionsError, setPositionsError] = useState<string | null>(null);
    const [headerError, setHeaderError] = useState<string | null>(null);

    const predictPositionsRef = useRef<PredictPositionsHandle>(null);
    const predictPositionsHeaderRef =
      useRef<PredictPositionsHeaderHandle>(null);

    const isHomepageRedesignV1Enabled = useSelector(
      selectHomepageRedesignV1Enabled,
    );

    const hasError = Boolean(positionsError || headerError);

    // Track positions tab load performance
    usePredictMeasurement({
      traceName: TraceName.PredictTabView,
      conditions: [
        !positionsError,
        !headerError,
        !isRefreshing,
        isVisible === true,
      ],
      debugContext: {
        hasErrors: !!(positionsError || headerError),
        errorStates: {
          positionsError: !!positionsError,
          headerError: !!headerError,
        },
        isRefreshing,
      },
    });

    const handleRefresh = useCallback(async () => {
      setIsRefreshing(true);
      // Clear errors before refreshing
      setPositionsError(null);
      setHeaderError(null);
      try {
        await Promise.all([
          predictPositionsRef.current?.refresh(),
          predictPositionsHeaderRef.current?.refresh(),
        ]);
      } finally {
        setIsRefreshing(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      refresh: handleRefresh,
    }));

    const handlePositionsError = useCallback((error: string | null) => {
      setPositionsError(error);
    }, []);

    const handleHeaderError = useCallback((error: string | null) => {
      setHeaderError(error);
    }, []);

    const content = (
      <>
        <PredictPositionsHeader
          ref={predictPositionsHeaderRef}
          onError={handleHeaderError}
        />
        <PredictPositions
          ref={predictPositionsRef}
          onError={handlePositionsError}
          isVisible={isVisible}
        />
        <PredictAddFundsSheet />
      </>
    );

    return (
      <View
        style={tw.style(
          isHomepageRedesignV1Enabled ? 'bg-default' : 'flex-1 bg-default',
        )}
        testID={
          isHomepageRedesignV1Enabled
            ? PredictTabViewSelectorsIDs.SCROLL_VIEW
            : undefined
        }
      >
        {hasError ? (
          <PredictOffline onRetry={handleRefresh} />
        ) : (
          <ConditionalScrollView
            isScrollEnabled={!isHomepageRedesignV1Enabled}
            scrollViewProps={{
              testID: PredictTabViewSelectorsIDs.SCROLL_VIEW,
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
