import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { ToastVariants, ButtonIconVariant } from '../../../components/Toast';
import { IconName as ToastIconName } from '../../../components/Icons/Icon';

const MultichainAddressRow = ({
  chainId,
  networkName,
  address,
  icons,
  copyParams,
  testID = MULTICHAIN_ADDRESS_ROW_TEST_ID,
  ...viewProps
}: MultichainAddressRowProps) => {
  const networkImageSource = getNetworkImageSource({ chainId });
  const truncatedAddress = useMemo(
    () => formatAddress(address, 'short'),
    [address],
  );

  const [iconState, setIconState] = useState<'copy' | 'check'>('copy');
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (!copyParams) return;

    // Execute copy callback
    await copyParams.callback();

    // Show icon feedback
    setIconState('check');
    if (iconTimerRef.current) {
      clearTimeout(iconTimerRef.current);
    }
    iconTimerRef.current = setTimeout(() => {
      setIconState('copy');
    }, 400);

    // Show toast if ref provided
    if (copyParams.toastRef?.current) {
      copyParams.toastRef.current.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [{ label: copyParams.toastMessage }],
        hasNoTimeout: false,
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: ToastIconName.Close,
          onPress: () => copyParams.toastRef?.current?.closeToast(),
        },
      });
    }
  }, [copyParams]);

  // Cleanup effect for icon timer
  useEffect(
    () => () => {
      if (iconTimerRef.current) {
        clearTimeout(iconTimerRef.current);
      }
    },
    [],
  );

  // Render additional icons passed to the component
  const renderIcons = () =>
    icons
      ? icons.map((icon: Icon) => (
          <ButtonIcon
            key={icon.name}
            iconName={icon.name}
            size={ButtonIconSize.Md}
            onPress={icon.callback}
            iconProps={{ color: IconColor.IconDefault }}
            testID={icon.testId}
          />
        ))
      : null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="p-4 gap-4 bg-default"
      testID={testID}
      {...viewProps}
    >
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
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
          testID={MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID}
        >
          {truncatedAddress}
        </Text>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-4"
      >
        {copyParams && (
          <ButtonIcon
            iconName={
              iconState === 'check' ? IconName.CopySuccess : IconName.Copy
            }
            size={ButtonIconSize.Md}
            onPress={handleCopy}
            iconProps={{
              color: IconColor.IconDefault,
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
