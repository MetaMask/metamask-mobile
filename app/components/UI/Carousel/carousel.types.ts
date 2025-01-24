import { ViewStyle } from 'react-native';

export interface CarouselSlide {
  id: string;
  title: string;
  description: string;
  image?: string;
  href?: string;
  dismissed?: boolean;
  undismissable?: boolean;
}

export interface CarouselProps {
  slides: CarouselSlide[];
  isLoading?: boolean;
  onClose?: (slideId: string) => void;
  onClick?: (slideId: string) => void;
  style?: ViewStyle;
}
