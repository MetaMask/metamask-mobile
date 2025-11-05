import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
} from 'react';

import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { IconColor } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { selectHomepageRedesignV1Enabled } from '../../../../../selectors/featureFlagController/homepage';
import Engine from '../../../../../core/Engine';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { PredictPosition as PredictPositionType } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import PredictNewButton from '../PredictNewButton';
import PredictPosition from '../PredictPosition/PredictPosition';
import PredictPositionEmpty from '../PredictPositionEmpty';
import PredictPositionResolved from '../PredictPositionResolved/PredictPositionResolved';
import { PredictPositionsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

export interface PredictPositionsHandle {
  refresh: () => Promise<void>;
}

interface PredictPositionsProps {
  isVisible?: boolean;
  /**
   * Callback when an error occurs during positions fetch
   */
  onError?: (error: string | null) => void;
}

const PredictPositions = forwardRef<
  PredictPositionsHandle,
  PredictPositionsProps
>(({ isVisible, onError }, ref) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );
  const { positions, isRefreshing, loadPositions, isLoading, error } =
    usePredictPositions({
      loadOnMount: true,
      refreshOnFocus: true,
    });
  const {
    positions: claimablePositions,
    loadPositions: loadClaimablePositions,
    error: claimableError,
  } = usePredictPositions({
    claimable: true,
    loadOnMount: true,
    refreshOnFocus: true,
  });

  // Notify parent of errors while keeping state isolated
  useEffect(() => {
    const combinedError = error || claimableError;
    onError?.(combinedError);
  }, [error, claimableError, onError]);

  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await Promise.all([
        loadPositions({ isRefresh: true }),
        loadClaimablePositions({ isRefresh: true }),
      ]);
    },
  }));

  // Track position viewed when tab becomes visible
  useEffect(() => {
    if (isVisible && !isLoading) {
      Engine.context.PredictController.trackPositionViewed({
        openPositionsCount: positions.length,
      });
    }
  }, [isVisible, isLoading, positions.length]);

  const renderPosition = useCallback(
    ({ item }: { item: PredictPositionType }) => (
      <PredictPosition
        position={item}
        onPress={() => {
          navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              marketId: item.marketId,
              entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
              headerShown: false,
            },
          });
        }}
      />
    ),
    [navigation],
  );

  const renderResolvedPosition = useCallback(
    ({ item }: { item: PredictPositionType }) => (
      <PredictPositionResolved
        position={item}
        onPress={() => {
          navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              marketId: item.marketId,
              entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
              headerShown: false,
            },
          });
        }}
      />
    ),
    [navigation],
  );

  if (isLoading || (isRefreshing && positions.length === 0)) {
    return (
      <View
        style={tw.style(
          isHomepageRedesignV1Enabled ? 'bg-default' : 'flex-1 bg-default',
        )}
      >
        <Box
          style={tw.style(
            isHomepageRedesignV1Enabled
              ? 'px-4 py-20 justify-center items-center'
              : 'flex-1 px-4 py-4 justify-center items-center',
          )}
        >
          <ActivityIndicator
            testID="activity-indicator"
            size="large"
            color={IconColor.Alternative}
          />
        </Box>
      </View>
    );
  }

  const isTrulyEmpty =
    positions.length === 0 && claimablePositions.length === 0;

  // TODO: Sort positions in the controller (business logic)
  return (
    <>
      <View testID={PredictPositionsSelectorsIDs.ACTIVE_POSITIONS_LIST}>
        {isTrulyEmpty ? (
          <PredictPositionEmpty />
        ) : (
          <>
            {positions.map((item) => (
              <React.Fragment key={`${item.outcomeId}:${item.outcomeIndex}`}>
                {renderPosition({ item })}
              </React.Fragment>
            ))}
          </>
        )}
      </View>
      {!isTrulyEmpty && <PredictNewButton />}
      {claimablePositions.length > 0 && (
        <>
          <Box>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative mb-4"
            >
              {strings('predict.tab.resolved_markets')}
            </Text>
          </Box>
          <View testID={PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST}>
            {claimablePositions
              .sort(
                (a, b) =>
                  new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
              )
              .map((item) => (
                <React.Fragment key={`${item.outcomeId}:${item.outcomeIndex}`}>
                  {renderResolvedPosition({ item })}
                </React.Fragment>
              ))}
          </View>
        </>
      )}
    </>
  );
});

PredictPositions.displayName = 'PredictPositions';

export default PredictPositions;
