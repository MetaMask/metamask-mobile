// This file contains type declarations for asset types.
// Ex. This makes it so that when you import CloseIcon from './close-icon.svg, CloseIcon, will be detected as a React.FC component.
declare module '*.mp4';

declare module '@exodus/react-native-payments/lib/js/__mocks__';

declare module 'react-native-fade-in-image';

declare module 'react-native-minimizer';

declare module '*.svg' {
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps & { name: string }>;
  export default content;
}

declare module '*.png' {
  import { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

declare module '@react-native-community/checkbox' {
  import CheckBoxOriginal from '@react-native-community/checkbox';

  type CheckBoxType = typeof CheckBoxOriginal;

  /**
   * @deprecated The `<CheckBox />` component has been deprecated in favor of the new `<Checkbox>` component from the component-library.
   * Please update your code to use the new `<Checkbox>` component instead, which can be found at app/component-library/components/Checkbox/Checkbox.tsx.
   * You can find documentation for the new Checkbox component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Checkbox}
   * If you would like to help with the replacement of the old CheckBox component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/6882}
   */
  export default class CheckBox extends CheckBoxType {}
}
