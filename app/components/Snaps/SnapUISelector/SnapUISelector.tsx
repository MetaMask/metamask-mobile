import React, { useEffect, useState } from 'react';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import Label from '../../../component-library/components/Form/Label';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import { Box } from '../../UI/Box/Box';
import { BorderRadius, FlexDirection } from '../../UI/Box/box.types';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { ButtonWidthTypes } from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../hooks/useStyles';
import stylesheet from './SnapUISelector.styles';
import { View, ScrollView, ViewStyle } from 'react-native';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import ApprovalModal from '../../Approvals/ApprovalModal';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import { State } from '@metamask/snaps-sdk';
import { isObject } from '@metamask/utils';

export interface SnapUISelectorProps {
  name: string;
  title: string;
  options: { key?: string; value: State; disabled: boolean }[];
  optionComponents: React.ReactNode[];
  form?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

interface SelectorItemProps {
  value: State;
  children: React.ReactNode;
  onSelect: (value: State) => void;
  selected?: boolean;
  disabled?: boolean;
}

const SelectorItem: React.FunctionComponent<SelectorItemProps> = ({
  value,
  children,
  onSelect,
  disabled,
  selected,
}) => {
  const { styles } = useStyles(stylesheet, { selected });

  const handlePress = () => {
    onSelect(value);
  };

  const buttonChildren = (
    <>
      {children}
      {selected && <Box style={styles.selectedPill} />}
    </>
  );

  return (
    <ButtonBase
      label={buttonChildren}
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

  const initialValue = getValue(name, form);

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

  const handleSelect = (value: State) => {
    setSelectedOption(value);
    handleInputChange(name, value, form);
    handleModalClose();
  };


  /**
   * Find the index of the selected option in the options array.
   * If the option is an object, use the provided key to compare the values.
   * If the option is a primitive, compare the values directly.
   */
  const selectedOptionIndex = options.findIndex((option) =>
    option.key && isObject(option.value)
      ? option.value[option.key as keyof typeof option.value] ===
        selectedOptionValue?.[option.key as keyof typeof selectedOptionValue]
      : option.value === selectedOptionValue,
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
                  key={`snap-ui-selector-${options[index].value}`}
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
