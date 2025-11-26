import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PerpsAdjustMarginActionSheet.styles';
import type {
  PerpsAdjustMarginActionSheetProps,
  AdjustMarginAction,
} from './PerpsAdjustMarginActionSheet.types';

interface ActionOption {
  action: AdjustMarginAction;
  label: string;
  description: string;
  iconName: IconName;
}

const PerpsAdjustMarginActionSheet: React.FC<
  PerpsAdjustMarginActionSheetProps
> = ({
  isVisible = true,
  onClose,
  onSelectAction,
  sheetRef: externalSheetRef,
  testID,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const actionOptions: ActionOption[] = useMemo(
    () => [
      {
        action: 'add_margin',
        label: strings('perps.adjust_margin.add_margin'),
        description: strings('perps.adjust_margin.add_margin_description'),
        iconName: IconName.Add,
      },
      {
        action: 'reduce_margin',
        label: strings('perps.adjust_margin.reduce_margin'),
        description: strings('perps.adjust_margin.reduce_margin_description'),
        iconName: IconName.Minus,
      },
    ],
    [],
  );

  const handleActionPress = useCallback(
    (action: AdjustMarginAction) => {
      onSelectAction(action);
      onClose();
    },
    [onSelectAction, onClose],
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
          {strings('perps.adjust_margin.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        {actionOptions.map((option, index) => (
          <React.Fragment key={option.action}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleActionPress(option.action)}
              activeOpacity={0.7}
            >
              <Icon
                name={option.iconName}
                size={IconSize.Lg}
                color={IconColor.Default}
              />
              <View style={styles.actionContent}>
                <Text variant={TextVariant.BodyMDBold}>{option.label}</Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
            {index < actionOptions.length - 1 && (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: colors.border.muted },
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </BottomSheet>
  );
};

PerpsAdjustMarginActionSheet.displayName = 'PerpsAdjustMarginActionSheet';

export default PerpsAdjustMarginActionSheet;
