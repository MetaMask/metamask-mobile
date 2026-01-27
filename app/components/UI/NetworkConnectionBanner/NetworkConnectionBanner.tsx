import React, { useCallback, useEffect } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAppTheme } from '../../../util/theme';
import { useNetworkConnectionBanner } from '../../hooks/useNetworkConnectionBanner';
import { strings } from '../../../../locales/i18n';
import { NetworkConnectionBannerState } from '../../../reducers/networkConnectionBanner';
import BannerBase from '../../../component-library/components/Banners/Banner/foundation/BannerBase';
import { Theme } from '../../../util/theme/models';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Platform, Pressable } from 'react-native';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconProps,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

interface BannerIcon {
  color: IconColor;
  name: IconName;
  component: typeof Icon | typeof SpinningIcon;
}

// This is alternative to AnimatedSpinner that allows us to use the "loading"
// icon from the design system
const SpinningIcon = ({ twClassName, ...iconProps }: IconProps) => {
  const tw = useTailwind();
  const rotation = useSharedValue(0);
  const animatedRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      // The -1 means to run the animation infinitely
      -1,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  return (
    <Animated.View
      style={[animatedRotation, twClassName && tw`${twClassName}`]}
    >
      <Icon {...iconProps} />
    </Animated.View>
  );
};

const PrimaryMessage = ({
  primaryMessageKey,
  networkConnectionBannerState,
}: {
  primaryMessageKey: string;
  networkConnectionBannerState: Exclude<
    NetworkConnectionBannerState,
    { visible: false }
  >;
}) => (
  <Text
    variant={TextVariant.BodyXs}
    fontWeight={FontWeight.Medium}
    twClassName="inline-block vertical-align-middle pr-1"
  >
    {strings(primaryMessageKey, {
      networkName: networkConnectionBannerState.networkName,
    })}
  </Text>
);

const SecondaryMessage = ({ content }: { content: React.ReactNode }) => (
  <Text
    variant={TextVariant.BodyXs}
    fontWeight={FontWeight.Medium}
    twClassName="inline-block vertical-align-middle"
  >
    {content}
  </Text>
);

/**
 * Shared button component for action links in the banner
 */
const ActionButton = ({
  isLowerCase,
  isOnlyChild,
  onPress,
  text,
}: {
  isLowerCase: boolean;
  isOnlyChild: boolean;
  onPress: () => void;
  text: string;
}) => {
  const tw = useTailwind();

  // Not using TextButton directly because the extra Text around it seems to
  // create extra vertical spacing in between lines on Android
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center',
          pressed ? 'bg-pressed' : 'bg-transparent',
          // Not sure why there are differences between platforms here, and
          // why the spacing changes when other text around the button is
          // present.
          !isOnlyChild &&
            (Platform.OS === 'ios'
              ? 'translate-y-[12px]'
              : 'translate-y-[6px]'),
        )
      }
      onPress={onPress}
    >
      {({ pressed }) => (
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          style={tw.style(
            'inline-block vertical-align-middle',
            pressed
              ? 'text-primary-default-pressed underline'
              : 'text-primary-default no-underline',
          )}
        >
          {isLowerCase ? text[0].toLowerCase() + text.slice(1) : text}
        </Text>
      )}
    </Pressable>
  );
};

const UpdateRpcButton = ({
  isLowerCase,
  isOnlyChild,
  updateRpc,
}: {
  isLowerCase: boolean;
  isOnlyChild: boolean;
  updateRpc: () => void;
}) => (
  <ActionButton
    isLowerCase={isLowerCase}
    isOnlyChild={isOnlyChild}
    onPress={updateRpc}
    text={strings('network_connection_banner.update_rpc')}
  />
);

const SwitchToInfuraButton = ({
  isLowerCase,
  isOnlyChild,
  switchToInfura,
}: {
  isLowerCase: boolean;
  isOnlyChild: boolean;
  switchToInfura: () => Promise<void>;
}) => (
  <ActionButton
    isLowerCase={isLowerCase}
    isOnlyChild={isOnlyChild}
    onPress={switchToInfura}
    text={strings('network_connection_banner.switch_to_metamask_default_rpc')}
  />
);

const getBannerContent = (
  theme: Theme,
  networkConnectionBannerState: Exclude<
    NetworkConnectionBannerState,
    { visible: false }
  >,
  updateRpc: () => void,
  switchToInfura: () => Promise<void>,
): {
  primaryMessage: React.ReactNode;
  secondaryMessage: React.ReactNode;
  backgroundColor: string;
  icon: BannerIcon;
} => {
  // Check if we have an Infura endpoint available to switch to
  const hasInfuraEndpoint =
    networkConnectionBannerState.infuraEndpointIndex !== undefined;

  if (networkConnectionBannerState.status === 'degraded') {
    const primaryMessage = (
      <PrimaryMessage
        primaryMessageKey="network_connection_banner.still_connecting_network"
        networkConnectionBannerState={networkConnectionBannerState}
      />
    );

    let secondaryMessage: React.ReactNode = null;
    if (!networkConnectionBannerState.isInfuraEndpoint) {
      // For custom endpoints, show either "Switch to MetaMask default RPC" or "Update RPC"
      const buttonContent = hasInfuraEndpoint ? (
        <SwitchToInfuraButton
          isLowerCase={false}
          isOnlyChild
          switchToInfura={switchToInfura}
        />
      ) : (
        <UpdateRpcButton
          isLowerCase={false}
          isOnlyChild
          updateRpc={updateRpc}
        />
      );
      secondaryMessage = <SecondaryMessage content={buttonContent} />;
    }

    return {
      primaryMessage,
      secondaryMessage,
      backgroundColor: theme.colors.background.section,
      icon: {
        color: IconColor.IconDefault,
        name: IconName.Loading,
        component: SpinningIcon,
      },
    };
  }

  const primaryMessage = (
    <PrimaryMessage
      primaryMessageKey="network_connection_banner.unable_to_connect_network"
      networkConnectionBannerState={networkConnectionBannerState}
    />
  );

  let secondaryMessageContent: React.ReactNode;
  if (networkConnectionBannerState.isInfuraEndpoint) {
    // Already on Infura, just show connectivity message
    secondaryMessageContent = strings(
      'network_connection_banner.check_network_connectivity',
    );
  } else if (hasInfuraEndpoint) {
    // Has Infura endpoint available, show "Switch to MetaMask default RPC"
    secondaryMessageContent = (
      <>
        {strings('network_connection_banner.check_network_connectivity_or')}{' '}
        <SwitchToInfuraButton
          key="switchToInfura"
          isLowerCase
          isOnlyChild={false}
          switchToInfura={switchToInfura}
        />
        {'.'}
      </>
    );
  } else {
    // No Infura endpoint available, show "Update RPC"
    secondaryMessageContent = (
      <>
        {strings('network_connection_banner.check_network_connectivity_or')}{' '}
        <UpdateRpcButton
          key="updateRpc"
          isLowerCase
          isOnlyChild={false}
          updateRpc={updateRpc}
        />
        {'.'}
      </>
    );
  }

  const secondaryMessage = (
    <SecondaryMessage content={secondaryMessageContent} />
  );

  return {
    primaryMessage,
    secondaryMessage,
    // Can't use Tailwind class here because they don't allow for using this
    // color as a background color
    backgroundColor: theme.colors.error.muted,
    icon: {
      color: IconColor.ErrorDefault,
      name: IconName.Danger,
      component: Icon,
    },
  };
};

export const NetworkConnectionBanner = () => {
  const theme = useAppTheme();
  const tw = useTailwind();
  const { networkConnectionBannerState, updateRpc, switchToInfura } =
    useNetworkConnectionBanner();

  const handleUpdateRpc = useCallback(() => {
    if (networkConnectionBannerState.visible) {
      updateRpc(
        networkConnectionBannerState.rpcUrl,
        networkConnectionBannerState.status,
        networkConnectionBannerState.chainId,
      );
    }
  }, [networkConnectionBannerState, updateRpc]);

  if (!networkConnectionBannerState.visible) {
    return null;
  }

  const { primaryMessage, secondaryMessage, backgroundColor, icon } =
    getBannerContent(
      theme,
      networkConnectionBannerState,
      handleUpdateRpc,
      switchToInfura,
    );

  return (
    <BannerBase
      style={{ backgroundColor, ...tw`rounded-md` }}
      startAccessory={
        <icon.component
          name={icon.name}
          size={IconSize.Sm}
          color={icon.color}
          // Vertically align icon with text better
          twClassName="mt-[0.1rem]"
        />
      }
      title={primaryMessage}
      description={secondaryMessage}
    />
  );
};

export default NetworkConnectionBanner;
