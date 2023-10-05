// This file contains type declarations for asset types.
// Ex. This makes it so that when you import CloseIcon from './close-icon.svg, CloseIcon, will be detected as a React.FC component.
declare module '*.mp4';

declare module '@exodus/react-native-payments/lib/js/__mocks__';

declare module 'react-native-fade-in-image';

declare module 'react-native-minimizer';

declare module '@react-native-community/checkbox';

declare module 'react-native-scrollable-tab-view/DefaultTabBar' {
  const content: React.FC<any>;
  export default content;
}

declare module '*.svg' {
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps & { name: string }>;
  export default content;
}

declare module 'images/image-icons' {
  const content: { [key: string]: ImageSourcePropType };
  export default content;
}

declare module '*.png' {
  import { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}
