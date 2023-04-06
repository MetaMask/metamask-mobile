declare module '*.mp4';

declare module '@exodus/react-native-payments/lib/js/__mocks__';

declare module 'react-native-fade-in-image';

declare module 'react-native-minimizer';

declare module '*.svg' {
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps & { name: string }>;
  export default content;
}
