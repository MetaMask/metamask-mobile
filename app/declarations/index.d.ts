// This file contains type declarations for asset types.
// Ex. This makes it so that when you import CloseIcon from './close-icon.svg, CloseIcon, will be detected as a React.FC component.
declare module '*.mp4';

declare module '@metamask/react-native-payments/lib/js/__mocks__';

declare module 'react-native-fade-in-image';

declare module 'react-native-fast-crypto';

declare module 'react-native-minimizer';

declare module 'xhr2';

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
   * @deprecated The `<CheckBox />` component has been deprecated in favor of `<Checkbox>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Checkbox | Checkbox component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/6882 | Tracking issue}
   */
  export default CheckBox;
}

declare module 'react-native-vector-icons/Ionicons' {
  import { IconProps } from 'react-native-vector-icons/Ionicons';

  const IonicIcon: ComponentType<IconProps>;

  /**
   * @deprecated The `<IonicIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8110 | Tracking issue}
   */
  export default IonicIcon;
}

declare module 'react-native-vector-icons/FontAwesome' {
  import { IconProps } from 'react-native-vector-icons/FontAwesome';

  const FontAwesomeIcon: ComponentType<IconProps>;

  /**
   * @deprecated The `<FontAwesomeIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8111 | Tracking issue}
   */
  export default FontAwesomeIcon;
}

declare module 'react-native-vector-icons/AntDesign' {
  import { IconProps } from 'react-native-vector-icons/AntDesign';

  const AntDesignIcon: ComponentType<IconProps>;

  /**
   * @deprecated The `<AntDesignIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8112 | Tracking issue}
   */
  export default AntDesignIcon;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { IconProps } from 'react-native-vector-icons/MaterialCommunityIcons';

  const MaterialCommunityIcons: ComponentType<IconProps>;
  /**
   * @deprecated The `<MaterialCommunityIconsIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8113 | Tracking issue}
   */
  export default MaterialCommunityIcons;
}

declare module 'react-native-vector-icons/Feather' {
  import { IconProps } from 'react-native-vector-icons/Feather';

  const FeatherIcon: ComponentType<IconProps>;

  /**
   * @deprecated The `<FeatherIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8114 | Tracking issue}
   */
  export default FeatherIcon;
}

declare module 'react-native-vector-icons/EvilIcons' {
  import { IconProps } from 'react-native-vector-icons/EvilIcons';

  const EvilIcons: ComponentType<IconProps>;

  /**
   * @deprecated The `<EvilIconsIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8115 | Tracking issue}
   */
  export default EvilIcons;
}

declare module 'react-native-vector-icons/SimpleLineIcons' {
  import { IconProps } from 'react-native-vector-icons/SimpleLineIcons';

  const SimpleLineIcons: ComponentType<IconProps>;

  /**
   * @deprecated The `<SimpleLineIconsIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8116 | Tracking issue}
   */
  export default SimpleLineIcons;
}

declare module 'react-native-vector-icons/MaterialIcons' {
  import { IconProps } from 'react-native-vector-icons/MaterialIcons';

  const MaterialIcons: ComponentType<IconProps>;

  /**
   * @deprecated The `<MaterialIconsIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8117 | Tracking issue}
   */
  export default MaterialIcons;
}

declare module 'react-native-vector-icons/FontAwesome5' {
  import { IconProps } from 'react-native-vector-icons/FontAwesome5';

  const FontAwesome5: ComponentType<IconProps>;

  /**
   * @deprecated The `<FontAwesome5Icon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8118 | Tracking issue}
   */
  export default FontAwesome5;
}

declare module 'react-native-vector-icons/Octicons' {
  import { IconProps } from 'react-native-vector-icons/Octicons';

  const Octicons: ComponentType<IconProps>;

  /**
   * @deprecated The `<OcticonsIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8119 | Tracking issue}
   */
  export default Octicons;
}

declare module 'react-native-vector-icons/Entypo' {
  import { IconProps } from 'react-native-vector-icons/Entypo';

  const Entypo: ComponentType<IconProps>;

  /**
   * @deprecated The `<EntypoIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8120 | Tracking issue}
   */
  export default Entypo;
}

declare module 'react-native-vector-icons/Foundation' {
  import { IconProps } from 'react-native-vector-icons/Foundation';

  const Foundation: ComponentType<IconProps>;

  /**
   * @deprecated The `<FoundationIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8121 | Tracking issue}
   */
  export default Foundation;
}

declare module 'react-native-vector-icons/Fontisto' {
  import { IconProps } from 'react-native-vector-icons/Fontisto';

  const Fontisto: ComponentType<IconProps>;

  /**
   * @deprecated The `<FontistoIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8122 | Tracking issue}
   */
  export default Fontisto;
}

declare module 'react-native-vector-icons/Zocial' {
  import { IconProps } from 'react-native-vector-icons/Zocial';

  const Zocial: ComponentType<IconProps>;

  /**
   * @deprecated The `<ZocialIcon />` component has been deprecated in favor of `<Icon>` from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/Icons/Icon | Icon component}
   *
   * Please replace this component with the equivalent component from `@metamask/design-system-react-native`.
   *
   * @see {@link https://github.com/MetaMask/metamask-mobile/issues/8123 | Tracking issue}
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

declare module '@metamask/react-native-actionsheet' {
  const ActionSheet;
  export default ActionSheet;
}

declare module '@metamask/react-native-search-api';

declare module 'react-native-progress/Bar' {
  import { BarPropTypes } from 'react-native-progress';
  import React from 'react';

  export default class ProgressBar extends React.Component<BarPropTypes> {}
}

// Augment the global Crypto interface to include createHmac method
interface Crypto {
  createHmac(
    algorithm: string,
    key: string | Buffer,
  ): {
    update(data: string): this;
    digest(): Buffer;
    digest(encoding: string): string;
  };
}

/**
 * @sentry/react-native types for v^6.10.0
 * Types are overridden to ensure captureException receives an Error type for more reliable stack traces
 * Reference - https://docs.sentry.io/platforms/javascript/usage/#capturing-errors
 */
declare module '@sentry/react-native' {
  export type {
    Breadcrumb,
    Request,
    SdkInfo,
    Event,
    Exception,
    SendFeedbackParams,
    SeverityLevel,
    Span,
    StackFrame,
    Stacktrace,
    Thread,
    User,
    UserFeedback,
  } from '@sentry/core';

  export {
    addBreadcrumb,
    captureEvent,
    captureFeedback,
    captureMessage,
    Scope,
    setContext,
    setExtra,
    setExtras,
    setTag,
    setTags,
    setUser,
    startInactiveSpan,
    startSpan,
    startSpanManual,
    getActiveSpan,
    getRootSpan,
    withActiveSpan,
    suppressTracing,
    spanToJSON,
    spanIsSampled,
    setMeasurement,
    getCurrentScope,
    getGlobalScope,
    getIsolationScope,
    getClient,
    setCurrentClient,
    addEventProcessor,
    metricsDefault as metrics,
    lastEventId,
  } from '@sentry/core';

  export {
    ErrorBoundary,
    withErrorBoundary,
    createReduxEnhancer,
    Profiler,
    useProfiler,
    withProfiler,
  } from '@sentry/react';

  export * from '@sentry/react-native/dist/js/integrations/exports';
  export { SDK_NAME, SDK_VERSION } from '@sentry/react-native/dist/js/version';
  export type { ReactNativeOptions } from '@sentry/react-native/dist/js/options';
  export { ReactNativeClient } from '@sentry/react-native/dist/js/client';
  export {
    init,
    wrap,
    nativeCrash,
    flush,
    close,
    captureUserFeedback,
    withScope,
    crashedLastRun,
  } from '@sentry/react-native/dist/js/sdk';
  export {
    TouchEventBoundary,
    withTouchEventBoundary,
  } from '@sentry/react-native/dist/js/touchevents';
  export {
    reactNativeTracingIntegration,
    getCurrentReactNativeTracingIntegration,
    getReactNativeTracingIntegration,
    reactNavigationIntegration,
    reactNativeNavigationIntegration,
    sentryTraceGesture,
    TimeToInitialDisplay,
    TimeToFullDisplay,
    startTimeToInitialDisplaySpan,
    startTimeToFullDisplaySpan,
    startIdleNavigationSpan,
    startIdleSpan,
    getDefaultIdleNavigationSpanOptions,
    createTimeToFullDisplay,
    createTimeToInitialDisplay,
  } from '@sentry/react-native/dist/js/tracing';
  export type { TimeToDisplayProps } from '@sentry/react-native/dist/js/tracing';
  export { Mask, Unmask } from '@sentry/react-native/dist/js/replay/CustomMask';
  export { FeedbackWidget } from '@sentry/react-native/dist/js/feedback/FeedbackWidget';
  export { showFeedbackWidget } from '@sentry/react-native/dist/js/feedback/FeedbackWidgetManager';
  export { getDataFromUri } from '@sentry/react-native/dist/js/wrapper';

  // Enforce exception to be of type Error for more reliable stack traces - https://docs.sentry.io/platforms/javascript/usage/#capturing-errors
  import { ExclusiveEventHintOrCaptureContext } from '@sentry/core/build/types/utils/prepareEvent';
  export function captureException(
    exception: Error,
    hint?: ExclusiveEventHintOrCaptureContext,
  ): string;
}
declare module '@tommasini/react-native-scrollable-tab-view';
declare module '@tommasini/react-native-scrollable-tab-view/DefaultTabBar';

declare module 'react-native-tcp-socket';
