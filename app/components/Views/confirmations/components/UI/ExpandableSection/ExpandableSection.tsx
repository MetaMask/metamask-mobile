import React, { useState } from 'react';
import { Text, View } from 'react-native';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../util/theme';
import createStyles from './style';
import BottomModal from '../BottomModal';

interface ExpandableSectionProps {
  content: React.ReactNode;
  modalContent: React.ReactNode;
  modalTitle: string;
  openButtonTestId?: string;
  closeButtonTestId?: string;
}

const ExpandableSection = ({
  content,
  modalContent,
  modalTitle,
  openButtonTestId,
  closeButtonTestId,
}: ExpandableSectionProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <View style={styles.container}>
        {content}
        <ButtonIcon
          iconColor={IconColor.Muted}
          size={ButtonIconSizes.Sm}
          onPress={() => setExpanded(true)}
          iconName={IconName.ArrowRight}
          testID={openButtonTestId ?? 'openButtonTestId'}
        />
      </View>
      {expanded && (
        <BottomModal>
          <View style={styles.modalContainer}></View>
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
            {modalContent}
          </View>
        </BottomModal>
      )}
    </View>
  );
};

export default ExpandableSection;
