import React, { ReactNode, useState } from 'react';
import { Text, View } from 'react-native';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import BottomModal from '../BottomModal';
import styleSheet from './ExpandableSection.styles';

interface ExpandableSectionProps {
  collapsedContent: ReactNode;
  expandedContent: ReactNode;
  modalTitle: string;
  openButtonTestId?: string;
  closeButtonTestId?: string;
}

const ExpandableSection = ({
  collapsedContent,
  expandedContent,
  modalTitle,
  openButtonTestId,
  closeButtonTestId,
}: ExpandableSectionProps) => {
  const { styles } = useStyles(styleSheet, {});
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <View style={styles.container}>
        {collapsedContent}
        <ButtonIcon
          iconColor={IconColor.Muted}
          size={ButtonIconSizes.Sm}
          onPress={() => setExpanded(true)}
          iconName={IconName.ArrowRight}
          testID={openButtonTestId ?? 'openButtonTestId'}
        />
      </View>
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
              <Text style={styles.modalTitle}>{modalTitle}</Text>
            </View>
            {expandedContent}
          </View>
        </BottomModal>
      )}
    </>
  );
};

export default ExpandableSection;
