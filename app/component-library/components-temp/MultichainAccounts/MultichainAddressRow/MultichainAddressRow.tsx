import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet, ViewProps } from 'react-native';
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

export const DEFAULT_SUCCESS_DURATION = 1200; // 1.4 seconds

const MultichainAddressRow = ({
  chainId,
  networkName,
  address,
  icons,
  style,
  copyParams,
  testID = MULTICHAIN_ADDRESS_ROW_TEST_ID,
}: MultichainAddressRowProps & ViewProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const networkImageSource = getNetworkImageSource({ chainId });
  const truncatedAddress = useMemo(
    () => formatAddress(address, 'short'),
    [address],
  );

  // Animated overlay for the green flash
  const progress = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimer = useRef<NodeJS.Timeout | null>(null);

  const clearSuccessTimer = useCallback(() => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
  }, []);

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
    Animated.sequence(steps).start();
  }, [progress]);

  const triggerSuccess = useCallback(() => {
    setShowSuccess(true);
    clearSuccessTimer();
    successTimer.current = setTimeout(() => {
      setShowSuccess(false);
    }, DEFAULT_SUCCESS_DURATION);
  }, [clearSuccessTimer]);

  const handleCopy = useCallback(() => {
    startBlink();
    triggerSuccess();
    copyParams?.callback();
  }, [copyParams, startBlink, triggerSuccess]);

  // Wrap icon callbacks to also blink + show message
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
    <View style={styles.base} testID={testID}>
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
        <ButtonIcon
          iconName={IconName.Copy}
          size={ButtonIconSizes.Md}
          onPress={handleCopy}
          iconColor={showSuccess ? IconColor.Success : IconColor.Default}
          testID={MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID}
        />
        {renderIcons()}
      </View>
    </View>
  );
};

export default MultichainAddressRow;
