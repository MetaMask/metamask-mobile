import React, { useCallback, useEffect } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAppTheme } from '../../../util/theme';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { useNetworkConnectionBanner } from '../../hooks/useNetworkConnectionBanner';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { NetworkConnectionBannerState } from '../../../reducers/networkConnectionBanner';
import BannerBase from '../../../component-library/components/Banners/Banner/foundation/BannerBase';
import { Theme } from '../../../util/theme/models';
import Animated, {
  AnimatedStyle,
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleProp, ViewStyle } from 'react-native';

interface BannerIcon {
  color: string;
  name: IconName;
  component: React.ComponentType<{
    name: IconName;
    size: IconSize;
    color: string;
    style?: object;
  }>;
}

const SpinningIcon = ({
  name,
  size,
  color,
  style,
}: {
  name: IconName;
  size: IconSize;
  color: string;
  style?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
}) => {
  const rotation = useSharedValue(0);
  const animatedRotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    // The -1 means to run the animation infinitely
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  return (
    <Animated.View style={[animatedRotation, style]}>
      <Icon name={name} size={size} color={color} data-testid="icon" />
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
}) => {
  const tw = useTailwind();

  return (
    <Text
      variant={TextVariant.BodyXSMedium}
      style={tw.style('inline-block', 'vertical-align-middle', 'pr-1')}
    >
      {strings(primaryMessageKey, {
        networkName: networkConnectionBannerState.networkName,
      })}
    </Text>
  );
};

const SecondaryMessage = ({ content }: { content: React.ReactNode }) => {
  const tw = useTailwind();

  return (
    <Text
      variant={TextVariant.BodyXSMedium}
      style={tw.style('inline-block', 'vertical-align-middle')}
    >
      {content}
    </Text>
  );
};

const UpdateRpcButton = ({
  isLowerCase,
  updateRpc,
}: {
  isLowerCase: boolean;
  updateRpc: () => void;
}) => {
  const tw = useTailwind();
  const updateRpcText = strings('network_connection_banner.update_rpc');

  return (
    <Button
      variant={ButtonVariants.Link}
      label={
        isLowerCase
          ? updateRpcText[0].toLowerCase() + updateRpcText.slice(1)
          : updateRpcText
      }
      labelTextVariant={TextVariant.BodyXSMedium}
      onPress={updateRpc}
      style={tw.style('vertical-align-middle')}
    />
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
            <UpdateRpcButton isLowerCase={false} updateRpc={updateRpc} />
          }
        />
      );

    return {
      primaryMessage,
      secondaryMessage,
      backgroundColor: theme.colors.background.section,
      icon: {
        color: theme.colors.icon.default,
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
        <UpdateRpcButton key="updateRpc" isLowerCase updateRpc={updateRpc} />
        {'.'}
      </>
    );
  const secondaryMessage = (
    <SecondaryMessage content={secondaryMessageContent} />
  );

  return {
    primaryMessage,
    secondaryMessage,
    backgroundColor: theme.colors.error.muted,
    icon: {
      color: theme.colors.error.default,
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
      style={{ backgroundColor }}
      startAccessory={
        <icon.component
          name={icon.name}
          size={IconSize.Sm}
          color={icon.color}
          style={tw.style('mt-[0.15rem]')}
        />
      }
      title={primaryMessage}
      description={secondaryMessage}
    />
  );
};

export default NetworkConnectionBanner;
