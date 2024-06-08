// This file contains type declarations for asset types.
// Ex. This makes it so that when you import CloseIcon from './close-icon.svg, CloseIcon, will be detected as a React.FC component.
declare module '*.mp4';

declare module '@metamask/react-native-payments/lib/js/__mocks__';

declare module 'react-native-fade-in-image';

declare module 'react-native-minimizer';

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

declare module 'react-native-vector-icons/Ionicons' {
  import IonicIconOriginal from 'react-native-vector-icons/Ionicons';

  type IonicIconType = typeof IonicIconOriginal;

  /**
   * @deprecated The `<IonicIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the IonicIcon component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8110}
   */
  export default class IonicIcon extends IonicIconType {}
}

declare module 'react-native-vector-icons/FontAwesome' {
  import FontAwesomeIconOriginal from 'react-native-vector-icons/FontAwesome';

  type FontAwesomeIconType = typeof FontAwesomeIconOriginal;

  /**
   * @deprecated The `<FontAwesomeIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the FontAwesomeIcon component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8111}
   */
  export default class FontAwesomeIcon extends FontAwesomeIconType {}
}

declare module 'react-native-vector-icons/AntDesign' {
  import AntDesignIconOriginal from 'react-native-vector-icons/AntDesign';

  type AntDesignIconType = typeof AntDesignIconOriginal;

  /**
   * @deprecated The `<AntDesignIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the AntDesignIcon component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8112}
   */
  export default class AntDesignIcon extends AntDesignIconType {}
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import MaterialCommunityIconsOriginal from 'react-native-vector-icons/MaterialCommunityIcons';

  type MaterialCommunityIconsType = typeof MaterialCommunityIconsOriginal;

  /**
   * @deprecated The `<MaterialCommunityIconsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the MaterialCommunityIcons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8113}
   */
  export default class MaterialCommunityIcons extends MaterialCommunityIconsIconType {}
}

declare module 'react-native-vector-icons/Feather' {
  import FeatherIconOriginal from 'react-native-vector-icons/Feather';

  type FeatherIconType = typeof FeatherIconOriginal;

  /**
   * @deprecated The `<FeatherIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the FeatherIcon component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8114}
   */
  export default class FeatherIcon extends FeatherIconType {}
}

declare module 'react-native-vector-icons/EvilIcons' {
  import EvilIconsOriginal from 'react-native-vector-icons/EvilIcons';

  type EvilIconsType = typeof EvilIconsOriginal;

  /**
   * @deprecated The `<EvilIconsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the EvilIcons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8115}
   */
  export default class EvilIcons extends EvilIconsType {}
}

declare module 'react-native-vector-icons/SimpleLineIcons' {
  import SimpleLineIconsOriginal from 'react-native-vector-icons/SimpleLineIcons';

  type SimpleLineIconsType = typeof SimpleLineIconsOriginal;

  /**
   * @deprecated The `<SimpleLineIconsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the SimpleLineIcons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8116}
   */
  export default class SimpleLineIcons extends SimpleLineIconsType {}
}

declare module 'react-native-vector-icons/MaterialIcons' {
  import MaterialIconsOriginal from 'react-native-vector-icons/MaterialIcons';

  type MaterialIconsType = typeof MaterialIconsOriginal;

  /**
   * @deprecated The `<MaterialIconsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the MaterialIcons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8117}
   */
  export default class MaterialIcons extends MaterialIconsType {}
}

declare module 'react-native-vector-icons/FontAwesome5' {
  import FontAwesome5IconOriginal from 'react-native-vector-icons/FontAwesome5';

  type FontAwesome5IconType = typeof FontAwesome5IconOriginal;

  /**
   * @deprecated The `<FontAwesome5Icon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the FontAwesome5 component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8118}
   */
  export default class FontAwesome5 extends FontAwesome5IconType {}
}

declare module 'react-native-vector-icons/Octicons' {
  import OcticonsIconOriginal from 'react-native-vector-icons/Octicons';

  type OcticonsIconType = typeof OcticonsIconOriginal;

  /**
   * @deprecated The `<OcticonsIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Octicons component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8119}
   */
  export default class Octicons extends OcticonsIconType {}
}

declare module 'react-native-vector-icons/Entypo' {
  import EntypoIconOriginal from 'react-native-vector-icons/Entypo';

  type EntypoIconType = typeof EntypoIconOriginal;

  /**
   * @deprecated The `<EntypoIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Entypo component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8120}
   */
  export default class Entypo extends EntypoIconType {}
}

declare module 'react-native-vector-icons/Foundation' {
  import FoundationIconOriginal from 'react-native-vector-icons/Foundation';

  type FoundationIconType = typeof FoundationIconOriginal;

  /**
   * @deprecated The `<FoundationIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Foundation component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8121}
   */
  export default class Foundation extends FoundationIconType {}
}

declare module 'react-native-vector-icons/Fontisto' {
  import FontistoIconOriginal from 'react-native-vector-icons/Fontisto';

  type FontistoIconType = typeof FontistoIconOriginal;

  /**
   * @deprecated The `<FontistoIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Fontisto component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8122}
   */
  export default class Fontisto extends FontistoIconType {}
}

declare module 'react-native-vector-icons/Zocial' {
  import ZocialIconOriginal from 'react-native-vector-icons/Zocial';

  type ZocialIconType = typeof ZocialIconOriginal;

  /**
   * @deprecated The `<ZocialIcon />` component has been deprecated in favor of the new `<Icon>` component from the component-library.
   * Please update your code to use the new `<Icon>` component instead, which can be found at app/component-library/components/Icons/Icon/Icon.tsx.
   * You can find documentation for the new Icon component in the README:
   * {@link https://github.com/MetaMask/metamask-mobile/tree/main/app/component-library/components/Icons/Icon/README.md}
   * If you would like to help with the replacement of the usage of the Zocial component, please submit a pull request against this GitHub issue:
   * {@link https://github.com/MetaMask/metamask-mobile/issues/8123}
   */
  export default class Zocial extends ZocialIconType {}
}

declare module '@metamask/contract-metadata' {
  const content: Record<string, TokenListToken>;
  export default content;
}
