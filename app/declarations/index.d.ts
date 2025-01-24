// This file contains type declarations for asset types.
// Ex. This makes it so that when you import CloseIcon from './close-icon.svg, CloseIcon, will be detected as a React.FC component.
declare module '*.mp4';

declare module '@metamask/react-native-payments/lib/js/__mocks__';

declare module 'react-native-fade-in-image';

declare module 'react-native-fast-crypto';

declare module 'react-native-minimizer';

declare module 'xhr2';
declare module 'react-native-scrollable-tab-view/DefaultTabBar' {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

declare module '@react-native-community/checkbox' {
  import { CheckBoxProps } from '@react-native-community/checkbox';

  const CheckBox: ComponentType<CheckBoxProps>;

  /**
   * @deprecated The `<CheckBox />` component has been deprecated in favor of the new `<Checkbox>` component from the component-library.
   * Please update your code to use the new `<Checkbox>` component instead, which can be found at app/component-library/components/Checkbox/Checkbox.tsx.
   * You can find documentation for the new Checkbox component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Checkbox}
   * If you would like to help with the replacement of the old CheckBox component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/6882}
   */
  export default CheckBox;
}

declare module 'react-native-vector-icons/Ionicons' {
  import { IconProps } from 'react-native-vector-icons/Ionicons';

  const IonicIcon: ComponentType<IconProps>;

  /**
   * @deprecated The `<IonicIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the IonicIcon component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8110}
   */
  export default IonicIcon;
}

declare module 'react-native-vector-icons/FontAwesome' {
  import { IconProps } from 'react-native-vector-icons/FontAwesome';

  const FontAwesomeIcon: ComponentType<IconProps>;

  /**
   * @deprecated The `<FontAwesomeIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the FontAwesomeIcon component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8111}
   */
  export default FontAwesomeIcon;
}

declare module 'react-native-vector-icons/AntDesign' {
  import { IconProps } from 'react-native-vector-icons/AntDesign';

  const AntDesignIcon: ComponentType<IconProps>;

  /**
   * @deprecated The `<AntDesignIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the AntDesignIcon component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8112}
   */
  export default AntDesignIcon;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { IconProps } from 'react-native-vector-icons/MaterialCommunityIcons';

  const MaterialCommunityIcons: ComponentType<IconProps>;
  /**
   * @deprecated The `<MaterialCommunityIconsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the MaterialCommunityIcons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8113}
   */
  export default MaterialCommunityIcons;
}

declare module 'react-native-vector-icons/Feather' {
  import { IconProps } from 'react-native-vector-icons/Feather';

  const FeatherIcon: ComponentType<IconProps>;

  /**
   * @deprecated The `<FeatherIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the FeatherIcon component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8114}
   */
  export default FeatherIcon;
}

declare module 'react-native-vector-icons/EvilIcons' {
  import { IconProps } from 'react-native-vector-icons/EvilIcons';

  const EvilIcons: ComponentType<IconProps>;

  /**
   * @deprecated The `<EvilIconsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the EvilIcons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8115}
   */
  export default EvilIcons;
}

declare module 'react-native-vector-icons/SimpleLineIcons' {
  import { IconProps } from 'react-native-vector-icons/SimpleLineIcons';

  const SimpleLineIcons: ComponentType<IconProps>;

  /**
   * @deprecated The `<SimpleLineIconsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the SimpleLineIcons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8116}
   */
  export default SimpleLineIcons;
}

declare module 'react-native-vector-icons/MaterialIcons' {
  import { IconProps } from 'react-native-vector-icons/MaterialIcons';

  const MaterialIcons: ComponentType<IconProps>;

  /**
   * @deprecated The `<MaterialIconsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the MaterialIcons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8117}
   */
  export default MaterialIcons;
}

declare module 'react-native-vector-icons/FontAwesome5' {
  import { IconProps } from 'react-native-vector-icons/FontAwesome5';

  const FontAwesome5: ComponentType<IconProps>;

  /**
   * @deprecated The `<FontAwesome5Icon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the FontAwesome5 component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8118}
   */
  export default FontAwesome5;
}

declare module 'react-native-vector-icons/Octicons' {
  import { IconProps } from 'react-native-vector-icons/Octicons';

  const Octicons: ComponentType<IconProps>;

  /**
   * @deprecated The `<OcticonsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Octicons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8119}
   */
  export default Octicons;
}

declare module 'react-native-vector-icons/Entypo' {
  import { IconProps } from 'react-native-vector-icons/Entypo';

  const Entypo: ComponentType<IconProps>;

  /**
   * @deprecated The `<EntypoIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Entypo component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8120}
   */
  export default Entypo;
}

declare module 'react-native-vector-icons/Foundation' {
  import { IconProps } from 'react-native-vector-icons/Foundation';

  const Foundation: ComponentType<IconProps>;

  /**
   * @deprecated The `<FoundationIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Foundation component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8121}
   */
  export default Foundation;
}

declare module 'react-native-vector-icons/Fontisto' {
  import { IconProps } from 'react-native-vector-icons/Fontisto';

  const Fontisto: ComponentType<IconProps>;

  /**
   * @deprecated The `<FontistoIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Fontisto component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8122}
   */
  export default Fontisto;
}

declare module 'react-native-vector-icons/Zocial' {
  import { IconProps } from 'react-native-vector-icons/Zocial';

  const Zocial: ComponentType<IconProps>;

  /**
   * @deprecated The `<ZocialIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Zocial component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8123}
   */
  export default Zocial;
}

declare module '@metamask/contract-metadata' {
  const content: Record<string, TokenListToken>;
  export default content;
}

declare module './util/termsOfUse/termsOfUseContent.ts' {
  const content: string;
  export default content;
}

declare module 'react-native-emoji' {
  const emoji: React.JSX;
  export default emoji;
}

declare module '@metamask/react-native-actionsheet' {
  const ActionSheet;
  export default ActionSheet;
}

declare module '@metamask/react-native-search-api';
