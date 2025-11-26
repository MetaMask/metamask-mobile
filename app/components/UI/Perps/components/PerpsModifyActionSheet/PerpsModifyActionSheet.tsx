import React, { useRef, useEffect, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Icon, {
  IconSize,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PerpsModifyActionSheet.styles';
import type { ModifyAction } from './PerpsModifyActionSheet.types';
import type { Position } from '../../controllers/types';

interface ActionOption {
  action: ModifyAction;
  label: string;
  description: string;
  iconName: IconName;
}

interface PerpsModifyActionSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  position: Position | null;
  onActionSelect: (action: ModifyAction) => void;
  sheetRef?: React.RefObject<BottomSheetRef>;
  testID?: string;
}

const PerpsModifyActionSheet: React.FC<PerpsModifyActionSheetProps> = ({
  isVisible = true,
  onClose,
  position,
  onActionSelect,
  sheetRef: externalSheetRef,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  // Get direction labels for the position
  const isLong = position?.size ? parseFloat(position.size) > 0 : true;
  const direction = isLong
    ? strings('perps.order.long_label')
    : strings('perps.order.short_label');
  const fromDirection = direction.toLowerCase();
  const toDirection = isLong
    ? strings('perps.order.short_label').toLowerCase()
    : strings('perps.order.long_label').toLowerCase();

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const actionOptions: ActionOption[] = [
    {
      action: 'add_to_position',
      label: strings('perps.modify.add_to_position'),
      description: strings('perps.modify.add_to_position_description', {
        direction: fromDirection,
      }),
      iconName: IconName.Add,
    },
    {
      action: 'reduce_position',
      label: strings('perps.modify.reduce_position'),
      description: strings('perps.modify.reduce_position_description', {
        direction: fromDirection,
      }),
      iconName: IconName.Minus,
    },
    {
      action: 'flip_position',
      label: strings('perps.modify.flip_position'),
      description: strings('perps.modify.flip_position_description', {
        fromDirection,
        toDirection,
      }),
      iconName: IconName.SwapHorizontal,
    },
  ];

  const handleActionPress = useCallback(
    (action: ModifyAction) => {
      onActionSelect(action);
      onClose();
    },
    [onActionSelect, onClose],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={!externalSheetRef}
      onClose={externalSheetRef ? onClose : undefined}
      testID={testID}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.modify.title')}
        </Text>
      </BottomSheetHeader>
      <Box style={styles.contentContainer}>
        {actionOptions.map((option, index) => (
          <TouchableOpacity
            key={option.action}
            style={[
              styles.actionItem,
              index < actionOptions.length - 1 && styles.actionItemBorder,
            ]}
            onPress={() => handleActionPress(option.action)}
            testID={`${testID}-${option.action}`}
          >
            <View style={styles.actionIconContainer}>
              <Icon
                name={option.iconName}
                size={IconSize.Md}
                color={styles.iconColor.color}
              />
            </View>
            <View style={styles.actionTextContainer}>
              <Text variant={TextVariant.BodyMDBold}>{option.label}</Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {option.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </Box>
    </BottomSheet>
  );
};

export default PerpsModifyActionSheet;
