import { StyleProp, ViewStyle } from 'react-native';

declare module 'expo-image' {
  export interface ImageProps {
    /**
     * Style for the image component
     */
    style?: StyleProp<ViewStyle>;
  }

  export class Image extends React.Component<ImageProps> {}
}
