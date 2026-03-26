import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

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
  const { height: windowHeight } = useWindowDimensions();

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
          <View style={[styles.modalContent, { maxHeight: windowHeight * 0.9 }]}>
            <HeaderCompactStandard
              title={expandedContentTitle}
              onClose={() => setExpanded(false)}
              closeButtonProps={{
                testID: collapseButtonTestID ?? 'collapseButtonTestID',
              }}
            />
            <View style={styles.scrollableArea}>
              {copyText && (
                <View style={styles.copyButtonContainer}>
                  <CopyButton copyText={copyText} />
                </View>
              )}
              <ScrollView
                style={styles.modalExpandedContent}
                contentContainerStyle={styles.modalExpandedContentContainer}
                nestedScrollEnabled
              >
                {expandedContent}
              </ScrollView>
            </View>
          </View>
        </BottomModal>
      )}
    </>
  );
};

export default Expandable;
