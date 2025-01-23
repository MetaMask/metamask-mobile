import { TextProps } from '../../../../../component-library/components/Texts/Text/Text.types';

interface Text extends Omit<TextProps, 'children'> {
  value: string;
}

export interface TokenListAsset {
  name: string;
  symbol: string;
  chainId: string;
  image: string;
}

export interface TokenListItemProps {
  token: TokenListAsset;
  primaryText: Text;
  secondaryText?: Text;
  onPress: (token: TokenListAsset) => void;
}
