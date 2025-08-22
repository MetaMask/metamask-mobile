import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../components/Avatars/Avatar';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../components/Buttons/ButtonIcon';
import Text, { TextVariant, TextColor } from '../../../components/Texts/Text';
import { IconColor, IconName } from '../../../components/Icons/Icon';
import { useStyles } from '../../../hooks';
import { formatAddress } from '../../../../util/address';
import { getNetworkImageSource } from '../../../../util/networks';
import styleSheet from './MultichainAddressRow.styles';
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
  style,
  copyParams,
  testID = MULTICHAIN_ADDRESS_ROW_TEST_ID,
  ...viewProps
}: MultichainAddressRowProps) => {
  const { styles } = useStyles(styleSheet, { style });
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
        useNativeDriver: false,
      }),
    );
    steps.push(
      Animated.timing(progress, {
        toValue: 0,
        duration: (2 * DEFAULT_SUCCESS_DURATION) / 3,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
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

  const handleCopy = useCallback(() => {
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
      copyParams.callback();
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
            size={ButtonIconSizes.Md}
            onPress={icon.callback}
            iconColor={IconColor.Default}
            testID={icon.testId}
          />
        ))
      : null;

  // Green overlay style (absolute fill)
  const overlayStyle = [
    StyleSheet.absoluteFillObject,
    {
      opacity: progress,
    },
  ];

  return (
    <View style={styles.base} testID={testID} {...viewProps}>
      <Animated.View
        pointerEvents="none"
        style={[overlayStyle, styles.overlay]}
      />
      <Avatar
        variant={AvatarVariant.Network}
        size={AvatarSize.Md}
        name={networkName}
        imageSource={networkImageSource}
        testID={MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID}
      />
      <View style={styles.content}>
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Default}
          testID={MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}
        >
          {networkName}
        </Text>
        {showSuccess && copyParams ? (
          <Text variant={TextVariant.BodySM} color={TextColor.Success}>
            {copyParams.successMessage}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            testID={MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID}
          >
            {truncatedAddress}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        {copyParams && (
          <ButtonIcon
            iconName={IconName.Copy}
            size={ButtonIconSizes.Md}
            onPress={handleCopy}
            iconColor={showSuccess ? IconColor.Success : IconColor.Default}
            testID={MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID}
          />
        )}
        {renderIcons()}
      </View>
    </View>
  );
};

export default MultichainAddressRow;
