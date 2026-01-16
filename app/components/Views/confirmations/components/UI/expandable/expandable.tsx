import React, { ReactNode, useState } from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
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
            <View style={styles.modalHeader}>
              <ButtonIcon
                iconColor={IconColor.Default}
                size={ButtonIconSizes.Sm}
                onPress={() => setExpanded(false)}
                iconName={IconName.ArrowLeft}
                testID={collapseButtonTestID ?? 'collapseButtonTestID'}
              />
              <Text style={styles.expandedContentTitle}>
                {expandedContentTitle}
              </Text>
            </View>
            {expandedContent}
          </View>
        </BottomModal>
      )}
    </>
  );
};

export default Expandable;
