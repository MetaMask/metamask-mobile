import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';
import BottomModal from '../bottom-modal';
import styleSheet from './expandable.styles';

interface ExpandableProps {
  collapsedContent: ReactNode;
  expandedContent: ReactNode;
  expandedContentTitle: string;
  collapseButtonTestID?: string;
  testID?: string;
  isCompact?: boolean;
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
            <HeaderCenter
              title={expandedContentTitle}
              onClose={() => setExpanded(false)}
              closeButtonProps={{
                testID: collapseButtonTestID ?? 'collapseButtonTestID',
              }}
            />
            <View style={styles.modalExpandedContent}>{expandedContent}</View>
          </View>
        </BottomModal>
      )}
    </>
  );
};

export default Expandable;
