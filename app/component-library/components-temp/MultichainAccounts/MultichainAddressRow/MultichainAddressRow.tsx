import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  Text,
  TextVariant,
  TextColor,
  IconName,
  IconColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../components/Avatars/Avatar';
import { formatAddress } from '../../../../util/address';
import { getNetworkImageSource } from '../../../../util/networks';
import { Icon, MultichainAddressRowProps } from './MultichainAddressRow.types';
import {
  MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID,
} from './MultichainAddressRow.constants';

export const DEFAULT_SUCCESS_DURATION = 1200; // 1.2 seconds

const MultichainAddressRow = ({
  chainId,
  networkName,
  address,
  icons,
  copyParams,
  testID = MULTICHAIN_ADDRESS_ROW_TEST_ID,
  ...viewProps
}: MultichainAddressRowProps) => {
  const tw = useTailwind();
  const networkImageSource = getNetworkImageSource({ chainId });
  const truncatedAddress = useMemo(
    () => formatAddress(address, 'short'),
    [address],
  );

  const progress = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup timer
  const clearSuccessTimer = useCallback(() => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
  }, []);

  // Animation function now returns a cleanup function, which we track and call on unmount!
  const startBlink = useCallback(() => {
    const steps: Animated.CompositeAnimation[] = [];
    steps.push(
      Animated.timing(progress, {
        toValue: 1,
        duration: DEFAULT_SUCCESS_DURATION / 3,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    steps.push(
      Animated.timing(progress, {
        toValue: 0,
        duration: (2 * DEFAULT_SUCCESS_DURATION) / 3,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    );
    // Start and properly manage animated sequence lifecycle
    const animation = Animated.sequence(steps);
    animation.start();
    // Cancel animation on unmount to avoid memory leaks
    return () => animation.stop();
  }, [progress]);

  const triggerSuccess = useCallback(() => {
    if (!copyParams) {
      return; // Prevent triggering feedback when copyParams are undefined
    }
    setShowSuccess(true);
    clearSuccessTimer();
    successTimer.current = setTimeout(() => {
      setShowSuccess(false);
    }, DEFAULT_SUCCESS_DURATION);
  }, [clearSuccessTimer, copyParams]);

  const handleCopy = useCallback(async () => {
    if (!copyParams) {
      return; // Prevent copying or triggering animations when copyParams are undefined
    }
    // Clean up previous animation if running
    if (animationCleanupRef.current) {
      animationCleanupRef.current();
      animationCleanupRef.current = null;
    }
    // Start new animation and retain its cleanup
    animationCleanupRef.current = startBlink();
    triggerSuccess();
    if (copyParams?.callback) {
      await copyParams.callback();
    }
  }, [copyParams, startBlink, triggerSuccess]);

  // Cleanup effect for timers and animation
  useEffect(
    () => () => {
      clearSuccessTimer();
      if (animationCleanupRef.current) {
        animationCleanupRef.current();
        animationCleanupRef.current = null;
      }
    },
    [clearSuccessTimer],
  );

  // Render additional icons passed to the component
  const renderIcons = () =>
    icons
      ? icons.map((icon: Icon, index: number) => (
          <ButtonIcon
            key={index}
            iconName={icon.name}
            size={ButtonIconSize.Md}
            onPress={icon.callback}
            iconProps={{ color: IconColor.IconDefault }}
            testID={icon.testId}
          />
        ))
      : null;

  // Green overlay style (absolute fill)
  const overlayStyle = [
    {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: progress,
    },
    tw.style('bg-success-muted'),
  ];

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="p-4 gap-4 bg-default"
      testID={testID}
      {...viewProps}
    >
      <Animated.View pointerEvents="none" style={overlayStyle} />
      <Avatar
        variant={AvatarVariant.Network}
        size={AvatarSize.Md}
        name={networkName}
        imageSource={networkImageSource}
        testID={MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID}
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Start}
        twClassName="flex-1"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          testID={MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}
        >
          {networkName}
        </Text>
        {showSuccess && copyParams ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.SuccessDefault}
            fontWeight={FontWeight.Medium}
          >
            {copyParams.successMessage}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
            testID={MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID}
          >
            {truncatedAddress}
          </Text>
        )}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-4"
      >
        {copyParams && (
          <ButtonIcon
            iconName={IconName.Copy}
            size={ButtonIconSize.Md}
            onPress={handleCopy}
            iconProps={{
              color: showSuccess
                ? IconColor.SuccessDefault
                : IconColor.IconDefault,
            }}
            testID={MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID}
          />
        )}
        {renderIcons()}
      </Box>
    </Box>
  );
};

export default MultichainAddressRow;
