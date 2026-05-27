import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { ReactNode, useEffect } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import TitleStandard from '../../../../component-library/components-temp/TitleStandard';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { mockTheme, useAppThemeFromContext } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';
import { HardwareDeviceTypes } from '../../../../constants/keyringTypes';
import { getConnectedDevicesCount } from '../../../../core/HardwareWallets/analytics';
import SelectHardwareTestIds from './SelectHardware.testIds';
import LedgerDarkLogo from '../../../../images/hardware-ledger-dark.svg';
import LedgerLightLogo from '../../../../images/hardware-ledger-light.svg';
import KeystoneDarkLogo from '../../../../images/hardware-keystone-dark.svg';
import KeystoneLightLogo from '../../../../images/hardware-keystone-light.svg';
import OneKeyDarkLogo from '../../../../images/hardware-onekey-dark.svg';
import OneKeyLightLogo from '../../../../images/hardware-onekey-light.svg';

interface HardwareOption {
  title: string;
  onPress: () => Promise<void>;
  leadingIcon: ReactNode;
  testID: string;
}

interface ConnectQrNavigationParams {
  hideMarketingContent?: boolean;
}

const SelectHardwareWallet = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { colors, themeAppearance } = useAppThemeFromContext() || mockTheme;
  const tw = useTailwind();
  const isDarkMode = themeAppearance === AppThemeKey.dark;
  const qrIconTileStyle = tw.style(
    'h-10 w-10 rounded-xl',
    isDarkMode ? 'bg-white' : 'bg-black',
  );
  const qrIconClassName = isDarkMode ? 'text-black' : 'text-white';
  const LedgerLogo = isDarkMode ? LedgerDarkLogo : LedgerLightLogo;
  const KeystoneLogo = isDarkMode ? KeystoneDarkLogo : KeystoneLightLogo;
  const OneKeyLogo = isDarkMode ? OneKeyDarkLogo : OneKeyLightLogo;

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const navigateToConnectQRWallet = async (
    params?: ConnectQrNavigationParams,
  ) => {
    try {
      const connectedDeviceCount = await getConnectedDevicesCount();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_HARDWARE_WALLET)
          .addProperties({
            device_type: HardwareDeviceTypes.QR,
            connected_device_count: connectedDeviceCount.toString(),
          })
          .build(),
      );
    } catch (error) {
      // [SelectHardware] Analytics error should not block navigation
      console.error('[SelectHardware] Failed to track analytics:', error);
    }
    if (params) {
      navigation.navigate(Routes.HW.CONNECT_QR_DEVICE, params);
      return;
    }

    navigation.navigate(Routes.HW.CONNECT_QR_DEVICE);
  };

  const navigateToConnectLedger = async () => {
    try {
      const connectedDeviceCount = await getConnectedDevicesCount();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CONNECT_HARDWARE_WALLET)
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            connected_device_count: connectedDeviceCount.toString(),
          })
          .build(),
      );
    } catch (error) {
      // [SelectHardware] Analytics error should not block navigation
      console.error('[SelectHardware] Failed to track analytics:', error);
    }

    navigation.navigate(Routes.HW.CONNECT_LEDGER);
  };

  const renderIconTile = (icon: ReactNode) => (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      style={qrIconTileStyle}
    >
      {icon}
    </Box>
  );

  const hardwareOptions: HardwareOption[] = [
    {
      title: HardwareDeviceTypes.LEDGER,
      onPress: navigateToConnectLedger,
      testID: SelectHardwareTestIds.LEDGER_BUTTON,
      leadingIcon: <LedgerLogo name="ledger-logo" width={40} height={40} />,
    },
    {
      title: 'Keystone',
      onPress: () => navigateToConnectQRWallet(),
      testID: SelectHardwareTestIds.KEYSTONE_BUTTON,
      leadingIcon: <KeystoneLogo name="keystone-logo" width={40} height={40} />,
    },
    {
      title: 'OneKey',
      onPress: () => navigateToConnectQRWallet({ hideMarketingContent: true }),
      testID: SelectHardwareTestIds.ONEKEY_BUTTON,
      leadingIcon: <OneKeyLogo name="onekey-logo" width={40} height={40} />,
    },
    {
      title: 'Other QR wallet',
      onPress: () => navigateToConnectQRWallet({ hideMarketingContent: true }),
      testID: SelectHardwareTestIds.OTHER_QR_BUTTON,
      leadingIcon: renderIconTile(
        <Icon
          name={IconName.QrCode}
          size={IconSize.Md}
          twClassName={qrIconClassName}
        />,
      ),
    },
  ];

  const renderHardwareButton = ({
    leadingIcon,
    onPress,
    testID,
    title,
  }: HardwareOption) => (
    <Pressable
      key={testID}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) =>
        tw.style(
          'w-full rounded-xl bg-muted px-4 py-3',
          pressed && 'opacity-80',
        )
      }
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        {leadingIcon}
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {title}
        </Text>
      </Box>
    </Pressable>
  );

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default', {
        backgroundColor: colors.background.default,
      })}
    >
      <HeaderCompactStandard includesTopInset onBack={navigation.goBack} />
      <TitleStandard
        title={strings('connect_hardware.title_select_hardware')}
        twClassName="px-4 pb-6"
      />
      <Box twClassName="gap-3 px-4">
        {hardwareOptions.map(renderHardwareButton)}
      </Box>
    </SafeAreaView>
  );
};

export default SelectHardwareWallet;
