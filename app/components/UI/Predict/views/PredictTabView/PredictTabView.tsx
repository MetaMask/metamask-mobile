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
import {
  PredictHomePositions,
  PredictHomePositionsHandle,
} from '../../components/PredictHome';
import PredictAddFundsSheet from '../../components/PredictAddFundsSheet/PredictAddFundsSheet';
import PredictOffline from '../../components/PredictOffline';
import { usePredictDepositToasts } from '../../hooks/usePredictDepositToasts';
import { usePredictClaimToasts } from '../../hooks/usePredictClaimToasts';
import { PredictTabViewSelectorsIDs } from '../../Predict.testIds';
import { usePredictWithdrawToasts } from '../../hooks/usePredictWithdrawToasts';
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
    const [error, setError] = useState<string | null>(null);

    const homePositionsRef = useRef<PredictHomePositionsHandle>(null);

    const isHomepageRedesignV1Enabled = useSelector(
      selectHomepageRedesignV1Enabled,
    );

    usePredictDepositToasts();
    usePredictClaimToasts();
    usePredictWithdrawToasts();

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
        style={tw.style(
          isHomepageRedesignV1Enabled ? 'bg-default' : 'flex-1 bg-default',
        )}
        testID={
          isHomepageRedesignV1Enabled
            ? PredictTabViewSelectorsIDs.SCROLL_VIEW
            : undefined
        }
      >
        {error ? (
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
