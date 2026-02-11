import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import BottomModal from '../bottom-modal';
import styleSheet from './expandable.styles';
import {
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

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
                iconProps={{
                  size: IconSize.Sm,
                }}
                size={ButtonIconSize.Sm}
                onPress={() => setExpanded(false)}
                iconName={IconName.ArrowLeft}
                testID={collapseButtonTestID ?? 'collapseButtonTestID'}
              />
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                style={styles.expandedContentTitle}
              >
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
