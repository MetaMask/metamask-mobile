import React, { FunctionComponent, ReactNode, useState } from 'react';
import ApprovalModal from '../../Approvals/ApprovalModal';
import { ScrollView, View } from 'react-native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import stylesheet from './SnapUITooltip.styles';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';

import Pressable from '../../../component-library/components-temp/Pressable';
export interface SnapUITooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export const SnapUITooltip: FunctionComponent<SnapUITooltipProps> = ({
  content,
  children,
}) => {
  const { styles } = useStyles(stylesheet, {});

  const [isOpen, setIsOpen] = useState(false);

  const handleOnOpen = () => {
    setIsOpen(true);
  };

  const handleOnCancel = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Pressable onPress={handleOnOpen}>{children}</Pressable>
      <ApprovalModal isVisible={isOpen} onCancel={handleOnCancel} avoidKeyboard>
        <View style={styles.modal}>
          <BottomSheetHeader onBack={handleOnCancel} />
          <ScrollView style={styles.content}>{content}</ScrollView>
        </View>
      </ApprovalModal>
    </>
  );
};
