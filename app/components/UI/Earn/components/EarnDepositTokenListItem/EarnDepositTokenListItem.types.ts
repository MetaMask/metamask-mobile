import { TextProps } from '@metamask/design-system-react-native';
import { TokenI } from '../../../Tokens/types';

interface Text extends Omit<TextProps, 'children'> {
  value?: string;
}

export interface EarnTokenListItemProps {
  token: TokenI;
  primaryText: Text;
  secondaryText?: Text;
  onPress: (token: TokenI) => void;
}
