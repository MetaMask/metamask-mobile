import React, { ReactNode, useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetRef,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { Modal, TouchableOpacity, View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';
import CopyButton from '../copy-button';
import styleSheet from './expandable.styles';

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
  const { styles } = useStyles(styleSheet, { isCompact });
  const [expanded, setExpanded] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const surfaceClass = useElevatedSurface();

  const handleClose = useCallback(() => {
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
        <Modal visible transparent animationType="none">
          <BottomSheet
            ref={bottomSheetRef}
            onClose={handleSheetClosed}
            twClassName={surfaceClass}
          >
            <View style={styles.modalContent}>
              <HeaderStandard
                title={expandedContentTitle}
                onClose={handleClose}
                closeButtonProps={{
                  testID: collapseButtonTestID ?? 'collapseButtonTestID',
                }}
              />
              <View style={styles.modalExpandedContent}>
                {copyText && (
                  <View style={styles.copyButtonContainer}>
                    <CopyButton copyText={copyText} />
                  </View>
                )}
                {expandedContent}
              </View>
            </View>
          </BottomSheet>
        </Modal>
      )}
    </>
  );
};

export default Expandable;
