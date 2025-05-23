import { StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';

declare module 'expo-image' {
  export interface ImageProps {
    /**
     * Style for the image component
     */
    style?: StyleProp<ViewStyle>;
    /**
     * Source of the image
     */
    source: ImageSourcePropType | { uri: string };
    /**
     * How the image should be resized to fit its container
     */
    contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    /**
     * Callback when image fails to load
     */
    onError?: (error: { error: string }) => void;
    /**
     * Duration of the fade-in animation in milliseconds
     */
    transition?: number;
  }

  export class Image extends React.Component<ImageProps> {}
}
