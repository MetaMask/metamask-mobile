import React, { ReactNode, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import BottomModal from '../BottomModal';
import styleSheet from './ExpandableSection.styles';

interface ExpandableSectionProps {
  collapsedContent: ReactNode;
  expandedContent: ReactNode;
  expandedContentTitle: string;
  closeButtonTestId?: string;
  iconVerticalPosition?: IconVerticalPosition;
}

export enum IconVerticalPosition {
  Top = 'top',
}

const ExpandableSection = ({
  collapsedContent,
  expandedContent,
  expandedContentTitle,
  closeButtonTestId,
  iconVerticalPosition,
}: ExpandableSectionProps) => {
  const { styles } = useStyles(styleSheet, {});
  const [expanded, setExpanded] = useState(false);

  const iconStyle =
    iconVerticalPosition === IconVerticalPosition.Top ? { top: 18 } : {};

  return (
    <>
      <TouchableOpacity
        onPress={() => setExpanded(true)}
        onPressIn={() => setExpanded(true)}
        onPressOut={() => setExpanded(true)}
        accessible
        activeOpacity={1}
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
        <BottomModal hideBackground>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ButtonIcon
                iconColor={IconColor.Default}
                size={ButtonIconSizes.Sm}
                onPress={() => setExpanded(false)}
                iconName={IconName.ArrowLeft}
                testID={closeButtonTestId ?? 'closeButtonTestId'}
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
