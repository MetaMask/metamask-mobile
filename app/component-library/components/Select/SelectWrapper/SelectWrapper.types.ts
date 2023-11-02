// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { SelectValueProps } from '../SelectValue/SelectValue.types';
import { SelectButtonProps } from '../SelectButton/SelectButton.types';

/**
 * SelectWrapper component props.
 */
export interface SelectWrapperProps extends ViewProps {
  placeholder?: string;
  value?: SelectValueProps;
  triggerComponent?: React.ReactNode;
  selectButtonProps?: SelectButtonProps;
  isOpen?: boolean;
  onChange?: () => void;
}
