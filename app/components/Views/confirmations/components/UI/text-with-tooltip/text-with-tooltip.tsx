import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  StyleProp,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Text,
  TextProps,
} from '@metamask/design-system-react-native';
import styleSheet from './text-with-tooltip.styles';
interface TextWithTooltipProps {
  ellipsizeMode?: TextProps['ellipsizeMode'];
  label: string;
  text: string;
  textStyle?: StyleProp<TextStyle>;
  textVariant?: TextProps['variant'];
  tooltip: string;
  tooltipTestId?: string;
}

const TextWithTooltip = ({
  ellipsizeMode,
  label,
  text,
  textStyle = {} as StyleProp<TextStyle>,
  textVariant,
  tooltip,
  tooltipTestId,
}: TextWithTooltipProps) => {
  const [isTooltipVisible, setTooltipVisible] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSheetClosed = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  return (
    <View>
      <TouchableOpacity onPress={() => setTooltipVisible(true)}>
        <Text
          ellipsizeMode={ellipsizeMode}
          style={textStyle}
          variant={textVariant}
        >
          {text}
        </Text>
      </TouchableOpacity>
      {isTooltipVisible && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={handleRequestClose}
        >
          <BottomSheet
            ref={bottomSheetRef}
            keyboardAvoidingViewEnabled={false}
            onClose={handleSheetClosed}
          >
            <BottomSheetHeader
              onClose={handleRequestClose}
              closeButtonProps={{
                testID: tooltipTestId ?? 'tooltipTestId',
              }}
            >
              {label}
            </BottomSheetHeader>
            <Box twClassName="flex flex-col">
              <View style={styles.tooltipContext}>
                <Text style={styles.text}>{tooltip}</Text>
              </View>
            </Box>
          </BottomSheet>
        </Modal>
      )}
    </View>
  );
};

export default TextWithTooltip;
