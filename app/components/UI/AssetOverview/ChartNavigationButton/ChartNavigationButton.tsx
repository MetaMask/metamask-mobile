import React from 'react';
import {
  FilterButton,
  FilterButtonSize,
  FilterButtonVariant,
  type FilterButtonProps,
} from '@metamask/design-system-react-native';

interface ChartNavigationButtonProps
  extends Omit<FilterButtonProps, 'children' | 'size' | 'value'> {
  onPress?: () => void;
  label: string;
  selected?: boolean;
  /** Override background color for the selected state (A/B test). */
  selectedColor?: string;
  disabled?: boolean;
}

const ChartNavigationButton: React.FC<ChartNavigationButtonProps> = ({
  onPress,
  label,
  selected,
  selectedColor,
  disabled = false,
  ...props
}) => {
  return (
    <FilterButton
      {...props}
      value={label}
      size={FilterButtonSize.Sm}
      variant={FilterButtonVariant.Secondary}
      onPress={onPress}
      isDisabled={disabled}
      twClassName={
        selectedColor && selected ? `bg-[${selectedColor}]` : undefined
      }
    >
      {label}
    </FilterButton>
  );
};

export default ChartNavigationButton;
