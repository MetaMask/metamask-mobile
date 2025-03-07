import React, { FunctionComponent, ReactNode, useState } from 'react';
import ApprovalModal from '../../Approvals/ApprovalModal';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import stylesheet from './SnapUITooltip.styles';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';

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
          <View style={styles.header}>
            <ButtonIcon
              iconName={IconName.ArrowLeft}
              iconColor={IconColor.Default}
              onPress={handleOnCancel}
              size={ButtonIconSizes.Md}
            />
          </View>
          <View style={styles.content}>{content}</View>
        </View>
      </ApprovalModal>
    </>
  );
};
