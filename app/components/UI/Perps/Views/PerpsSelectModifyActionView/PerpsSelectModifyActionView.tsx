import React, { useCallback, useRef } from 'react';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { Position } from '../../controllers/types';
import type { PerpsNavigationParamList } from '../../types/navigation';
import PerpsModifyActionSheet, {
  type ModifyAction,
} from '../../components/PerpsModifyActionSheet';
import { usePerpsNavigation } from '../../hooks/usePerpsNavigation';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';

interface PerpsSelectModifyActionViewProps {
  sheetRef?: React.RefObject<BottomSheetRef>;
  position?: Position;
  onClose?: () => void;
  onReversePosition?: (position: Position) => void;
}

const PerpsSelectModifyActionView: React.FC<
  PerpsSelectModifyActionViewProps
> = ({
  sheetRef: externalSheetRef,
  position: positionProp,
  onClose: onExternalClose,
  onReversePosition,
}) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsSelectModifyAction'>>();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Support both props and route params
  const position = positionProp || route.params?.position;
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;
  const { navigateToOrder, navigateToClosePosition } = usePerpsNavigation();

  const handleActionSelect = useCallback(
    (action: ModifyAction) => {
      if (!position) return;

      // Track UI interaction based on action type
      const getInteractionType = () => {
        switch (action) {
          case 'add_to_position':
            return PerpsEventValues.INTERACTION_TYPE.INCREASE_EXPOSURE;
          case 'reduce_position':
            return PerpsEventValues.INTERACTION_TYPE.REDUCE_EXPOSURE;
          case 'flip_position':
            return PerpsEventValues.INTERACTION_TYPE.FLIP_POSITION;
          default:
            return null;
        }
      };

      const interactionType = getInteractionType();
      if (interactionType) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
            .addProperties({
              [PerpsEventProperties.INTERACTION_TYPE]: interactionType,
              [PerpsEventProperties.ASSET]: position.symbol,
              [PerpsEventProperties.SOURCE]:
                PerpsEventValues.SOURCE.POSITION_SCREEN,
              [PerpsEventProperties.DIRECTION]:
                parseFloat(position.size) > 0
                  ? PerpsEventValues.DIRECTION.LONG
                  : PerpsEventValues.DIRECTION.SHORT,
            })
            .build(),
        );
      }

      // Navigate BEFORE closing (prevents navigation loss from component unmounting)
      switch (action) {
        case 'add_to_position':
          // Open trade screen in same direction with existing position context
          {
            const direction = parseFloat(position.size) > 0 ? 'long' : 'short';
            navigateToOrder({
              direction,
              asset: position.symbol,
              existingPosition: position, // Pass position to maintain leverage consistency
              hideTPSL: true, // Hide TP/SL when adding to existing position
            });
          }
          break;

        case 'reduce_position':
          // Open close position screen
          navigateToClosePosition(position);
          break;

        case 'flip_position':
          // If parent provides onReversePosition callback, use it (shows confirmation sheet)
          // Otherwise, navigate directly to order screen (legacy behavior)
          if (onReversePosition) {
            onReversePosition(position);
          } else {
            const oppositeDirection =
              parseFloat(position.size) > 0 ? 'short' : 'long';
            const positionSize = Math.abs(parseFloat(position.size));
            const positionLeverage = position.leverage?.value;

            navigateToOrder({
              direction: oppositeDirection,
              asset: position.symbol,
              amount: positionSize.toString(),
              leverage: positionLeverage,
            });
          }
          break;
      }

      // Close bottom sheet AFTER navigation is triggered
      sheetRef.current?.onCloseBottomSheet(() => {
        onExternalClose?.();
      });
    },
    [
      position,
      navigateToOrder,
      navigateToClosePosition,
      onReversePosition,
      sheetRef,
      onExternalClose,
      trackEvent,
      createEventBuilder,
    ],
  );

  const handleClose = useCallback(() => {
    if (externalSheetRef) {
      sheetRef.current?.onCloseBottomSheet(() => {
        onExternalClose?.();
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, externalSheetRef, sheetRef, onExternalClose]);

  return (
    <PerpsModifyActionSheet
      onClose={handleClose}
      position={position}
      onActionSelect={handleActionSelect}
      sheetRef={sheetRef}
    />
  );
};

export default PerpsSelectModifyActionView;
