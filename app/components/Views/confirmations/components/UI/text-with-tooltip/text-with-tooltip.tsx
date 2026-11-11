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
  BottomSheetRef,
  Box,
  Text,
  TextProps,
} from '@metamask/design-system-react-native';
import styleSheet from './text-with-tooltip.styles';
import BottomSheetHeaderGlass from '../../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
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
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
            <BottomSheetHeaderGlass
              isGlass={isGlassHeader}
              onClose={handleRequestClose}
              closeButtonProps={{
                testID: tooltipTestId ?? 'tooltipTestId',
              }}
            >
              {label}
            </BottomSheetHeaderGlass>
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
