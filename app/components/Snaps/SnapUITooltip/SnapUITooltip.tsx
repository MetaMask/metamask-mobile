import React, { FunctionComponent, ReactNode, useState } from 'react';
import ApprovalModal from '../../Approvals/ApprovalModal';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import stylesheet from './SnapUITooltip.styles';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';

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
      <TouchableOpacity onPress={handleOnOpen}>{children}</TouchableOpacity>
      <ApprovalModal isVisible={isOpen} onCancel={handleOnCancel}>
        <View style={styles.modal}>
          <BottomSheetHeader onBack={handleOnCancel} />
          <ScrollView style={styles.content}>{content}</ScrollView>
        </View>
      </ApprovalModal>
    </>
  );
};
