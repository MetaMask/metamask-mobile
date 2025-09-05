import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';

export interface SuccessErrorSheetParams {
  onClose?: () => void;
  onButtonPress?: () => void;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  customButton?: React.ReactNode;
  type: 'success' | 'error';
  icon?: IconName;
  secondaryButtonLabel?: string;
  onSecondaryButtonPress?: () => void;
  primaryButtonLabel?: string;
  onPrimaryButtonPress?: () => void;
  isInteractable?: boolean;
  closeOnPrimaryButtonPress?: boolean;
  closeOnSecondaryButtonPress?: boolean;
  reverseButtonOrder?: boolean;
  descriptionAlign?: 'center' | 'left';
  iconColor?: IconColor;
}
