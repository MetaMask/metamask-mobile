import React, { ReactNode, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetRef,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { Modal, TouchableOpacity, View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import CopyButton from '../copy-button';
import styleSheet from './expandable.styles';
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';

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
          onRequestClose={() => bottomSheetRef.current?.onCloseBottomSheet()}
        >
          <View style={styles.modalRoot}>
            <BottomSheet
              ref={bottomSheetRef}
              onClose={() => setExpanded(false)}
              twClassName={surfaceClass}
            >
              <HeaderStandard
                title={expandedContentTitle}
                onClose={() => bottomSheetRef.current?.onCloseBottomSheet()}
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
            </BottomSheet>
          </View>
        </Modal>
      )}
    </>
  );
};

export default Expandable;
