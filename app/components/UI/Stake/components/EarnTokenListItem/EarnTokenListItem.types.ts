import { TextProps } from '../../../../../component-library/components/Texts/Text/Text.types';
import { TokenI } from '../../../Tokens/types';

interface Text extends Omit<TextProps, 'children'> {
  value: string;
}

export interface EarnTokenListItemProps {
  token: TokenI;
  primaryText: Text;
  secondaryText?: Text;
  onPress: (token: TokenI) => void;
}
