import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import BottomModal from '../bottom-modal';
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
        <BottomModal onClose={() => setExpanded(false)}>
          <View style={styles.modalContent}>
            <HeaderCompactStandard
              title={expandedContentTitle}
              onClose={() => setExpanded(false)}
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
        </BottomModal>
      )}
    </>
  );
};

export default Expandable;
