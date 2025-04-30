import React, { ReactNode, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import BottomModal from '../bottom-modal';
import styleSheet from './expandable-section.styles';

interface ExpandableSectionProps {
  collapsedContent: ReactNode;
  expandedContent: ReactNode;
  expandedContentTitle: string;
  iconVerticalPosition?: IconVerticalPosition;
  collapseButtonTestID?: string;
  testID?: string;
  isCompact?: boolean;
}

export enum IconVerticalPosition {
  Top = 'top',
}

const ExpandableSection = ({
  collapsedContent,
  expandedContent,
  expandedContentTitle,
  iconVerticalPosition,
  collapseButtonTestID,
  testID,
  isCompact,
}: ExpandableSectionProps) => {
  const { styles } = useStyles(styleSheet, { isCompact });
  const [expanded, setExpanded] = useState(false);

  const iconStyle =
    iconVerticalPosition === IconVerticalPosition.Top ? { top: 20 } : {};

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
        <View style={styles.container}>
          {collapsedContent}
          <Icon
            color={IconColor.Muted}
            size={IconSize.Sm}
            name={IconName.ArrowRight}
            style={{
              ...styles.expandIcon,
              ...iconStyle,
            }}
          />
        </View>
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

export default ExpandableSection;
