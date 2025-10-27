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

const UpdateRpcButton = ({
  isLowerCase,
  isOnlyChild,
  updateRpc,
}: {
  isLowerCase: boolean;
  isOnlyChild: boolean;
  updateRpc: () => void;
}) => {
  const updateRpcText = strings('network_connection_banner.update_rpc');

  const tw = useTailwind();

  // Not using TextButton directly because the extra Text around it seems to
  // create extra vertical spacing in between lines on Android
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        tw`flex-row items-center ${pressed ? 'bg-pressed' : 'bg-transparent'}`,
      ]}
      onPress={updateRpc}
    >
      {({ pressed }) => (
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          style={tw.style(
            // Not sure why there are differences between platforms here, and
            // why the spacing changes when other text around the button is
            // present.
            isOnlyChild
              ? undefined
              : Platform.OS === 'ios'
              ? 'translate-y-[12px]'
              : 'translate-y-[6px]',
            'vertical-align-middle',
            pressed
              ? 'text-primary-default-pressed underline'
              : 'text-primary-default no-underline',
          )}
        >
          {isLowerCase
            ? updateRpcText[0].toLowerCase() + updateRpcText.slice(1)
            : updateRpcText}
        </Text>
      )}
    </Pressable>
  );
};

const getBannerContent = (
  theme: Theme,
  networkConnectionBannerState: Exclude<
    NetworkConnectionBannerState,
    { visible: false }
  >,
  updateRpc: () => void,
): {
  primaryMessage: React.ReactNode;
  secondaryMessage: React.ReactNode;
  backgroundColor: string;
  icon: BannerIcon;
} => {
  if (networkConnectionBannerState.status === 'degraded') {
    const primaryMessage = (
      <PrimaryMessage
        primaryMessageKey="network_connection_banner.still_connecting_network"
        networkConnectionBannerState={networkConnectionBannerState}
      />
    );
    const secondaryMessage =
      networkConnectionBannerState.isInfuraEndpoint ? null : (
        <SecondaryMessage
          content={
            <UpdateRpcButton
              isLowerCase={false}
              isOnlyChild
              updateRpc={updateRpc}
            />
          }
        />
      );

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
  const secondaryMessageContent =
    networkConnectionBannerState.isInfuraEndpoint ? (
      strings('network_connection_banner.check_network_connectivity')
    ) : (
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
  const { networkConnectionBannerState, updateRpc } =
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
    getBannerContent(theme, networkConnectionBannerState, handleUpdateRpc);

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
