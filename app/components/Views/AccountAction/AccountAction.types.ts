import { Props } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

export interface WalletActionProps extends TouchableOpacityProps {
  actionTitle: string;
  iconName: IconName;
  iconSize?: IconSize;
  disabled?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type TouchableOpacityStyleSheetVars = Pick<
  TouchableOpacityProps,
  'style' | 'disabled'
>;
