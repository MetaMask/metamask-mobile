import React, { useEffect, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import Label from '../../../component-library/components/Form/Label';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import { Box } from '../../UI/Box/Box';
import { FlexDirection } from '../../UI/Box/box.types';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { ButtonWidthTypes } from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../hooks/useStyles';
import stylesheet from './SnapUISelector.styles';
import { View, ScrollView, ViewStyle } from 'react-native';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import ApprovalModal from '../../Approvals/ApprovalModal';
import { TextVariant } from '../../../component-library/components/Texts/Text';

export interface SnapUISelectorProps {
  name: string;
  title: string;
  options: { value: string; disabled: boolean }[];
  optionComponents: React.ReactNode[];
  form?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

interface SelectorItemProps {
  value: string;
  children: React.ReactNode;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

const SelectorItem: React.FunctionComponent<SelectorItemProps> = ({
  value,
  children,
  onSelect,
  disabled,
}) => {
  const { styles } = useStyles(stylesheet, {});

  const handlePress = () => {
    onSelect(value);
  };

  return (
    <ButtonBase
      label={children}
      width={ButtonWidthTypes.Full}
      onPress={handlePress}
      style={styles.modalButton}
      isDisabled={disabled}
    />
  );
};

export const SnapUISelector: React.FunctionComponent<SnapUISelectorProps> = ({
  name,
  title,
  options,
  optionComponents,
  form,
  label,
  error,
  disabled,
  style,
}) => {
  const { styles } = useStyles(stylesheet, {});
  const { handleInputChange, getValue } = useSnapInterfaceContext();

  const initialValue = getValue(name, form) as string;

  const [selectedOptionValue, setSelectedOption] = useState(initialValue);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null) {
      setSelectedOption(initialValue);
    }
  }, [initialValue]);

  const handleModalOpen = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => setIsModalOpen(false);

  const handleSelect = (value: string) => {
    setSelectedOption(value);
    handleInputChange(name, value, form);
    handleModalClose();
  };

  const selectedOptionIndex = options.findIndex(
    (option) => option.value === selectedOptionValue,
  );

  const selectedOption = optionComponents[selectedOptionIndex];

  return (
    <>
      <Box style={style} flexDirection={FlexDirection.Column}>
        {label && <Label variant={TextVariant.BodyMDMedium}>{label}</Label>}
        <ButtonBase
          width={ButtonWidthTypes.Full}
          label={selectedOption}
          isDisabled={disabled}
          endIconName={IconName.ArrowDown}
          onPress={handleModalOpen}
          style={styles.button}
        />
        {error && (
          <HelpText severity={HelpTextSeverity.Error} style={styles.helpText}>
            {error}
          </HelpText>
        )}
      </Box>
      <ApprovalModal
        isVisible={isModalOpen}
        onCancel={handleModalClose}
        avoidKeyboard
      >
        <View style={styles.modal}>
          <BottomSheetHeader onBack={handleModalClose}>
            {title}
          </BottomSheetHeader>
          <ScrollView>
            <Box
              flexDirection={FlexDirection.Column}
              gap={8}
              style={styles.content}
            >
              {optionComponents.map((component, index) => (
                <SelectorItem
                  key={options[index].value}
                  value={options[index].value}
                  disabled={options[index]?.disabled}
                  onSelect={handleSelect}
                >
                  {component}
                </SelectorItem>
              ))}
            </Box>
          </ScrollView>
        </View>
      </ApprovalModal>
    </>
  );
};
