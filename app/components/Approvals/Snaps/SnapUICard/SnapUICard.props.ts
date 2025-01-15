import { ImageSourcePropType } from 'react-native';

export interface SnapUICardProps {
  image?: ImageSourcePropType;
  title?: string;
  description?: string;
  value?: string;
  extra?: string;
}
