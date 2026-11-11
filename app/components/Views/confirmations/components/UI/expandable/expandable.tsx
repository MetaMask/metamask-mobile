import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import {
  BottomSheet,
  BottomSheetRef,
  Box,
} from '@metamask/design-system-react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import CopyButton from '../copy-button';
import styleSheet from './expandable.styles';
import BottomSheetHeaderGlass from '../../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';

interface ExpandableProps {
  collapsedContent: ReactNode;
  expandedContent: ReactNode;
  expandedContentTitle: string;
  collapseButtonTestID?: string;
  testID?: string;
  isCompact?: boolean;
  copyText?: string;
}

export enum IconVerticalPosition {
  Top = 'top',
}

const Expandable = ({
  collapsedContent,
  expandedContent,
  expandedContentTitle,
  collapseButtonTestID,
  testID,
  isCompact,
  copyText,
}: ExpandableProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { styles } = useStyles(styleSheet, { isCompact });
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [expanded, setExpanded] = useState(false);

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSheetClosed = useCallback(() => {
    setExpanded(false);
  }, []);

  return (
    <>
      <TouchableOpacity
        onPress={() => setExpanded(true)}
        onPressIn={() => setExpanded(true)}
        onPressOut={() => setExpanded(true)}
        accessible
        activeOpacity={1}
        testID={testID ?? 'expandableSection'}
      >
        {collapsedContent}
      </TouchableOpacity>
      {expanded && (
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
                testID: collapseButtonTestID ?? 'collapseButtonTestID',
              }}
            >
              {expandedContentTitle}
            </BottomSheetHeaderGlass>
            <Box twClassName="flex flex-col">
              <View style={styles.modalExpandedContent}>
                {copyText && (
                  <View style={styles.copyButtonContainer}>
                    <CopyButton copyText={copyText} />
                  </View>
                )}
                {expandedContent}
              </View>
            </Box>
          </BottomSheet>
        </Modal>
      )}
    </>
  );
};

export default Expandable;
