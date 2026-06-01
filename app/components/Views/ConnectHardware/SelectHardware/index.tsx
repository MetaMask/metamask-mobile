import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
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
import { Image, Pressable, StyleSheet, View } from 'react-native';
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
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { getConnectedDevicesCount } from '../../../../core/HardwareWallets/analytics';
import SelectHardwareTestIds from './SelectHardware.testIds';
import LedgerDarkLogo from '../../../../images/hardware-ledger-dark.svg';
import LedgerLightLogo from '../../../../images/hardware-ledger-light.svg';
import KeystoneDarkLogo from '../../../../images/hardware-keystone-dark.svg';
import KeystoneLightLogo from '../../../../images/hardware-keystone-light.svg';
import OneKeyDarkLogo from '../../../../images/hardware-onekey-dark.svg';
import OneKeyLightLogo from '../../../../images/hardware-onekey-light.svg';

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  buttonsContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  previewButton: {
    width: '100%',
  },
});
interface HardwareOption {
  title: string;
  onPress: () => Promise<void>;
  leadingIcon: ReactNode;
  testID: string;
}

interface ConnectQrNavigationParams {
  hideMarketingContent?: boolean;
}

export const getHardwareThemeAssets = (themeAppearance: AppThemeKey) => {
  const isDarkMode = themeAppearance === AppThemeKey.dark;

  return {
    qrIconTileClassName: isDarkMode ? 'bg-white' : 'bg-black',
    qrIconClassName: isDarkMode ? 'text-black' : 'text-white',
    LedgerLogo: isDarkMode ? LedgerDarkLogo : LedgerLightLogo,
    KeystoneLogo: isDarkMode ? KeystoneDarkLogo : KeystoneLightLogo,
    OneKeyLogo: isDarkMode ? OneKeyDarkLogo : OneKeyLightLogo,
  };
};

const SelectHardwareWallet = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { colors, themeAppearance } = useAppThemeFromContext() || mockTheme;
  const tw = useTailwind();
  const {
    qrIconTileClassName,
    qrIconClassName,
    LedgerLogo,
    KeystoneLogo,
    OneKeyLogo,
  } = getHardwareThemeAssets(themeAppearance);
  const qrIconTileStyle = tw.style('h-10 w-10 rounded-xl', qrIconTileClassName);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const navigateToConnectQRWallet = async (
    _params?: ConnectQrNavigationParams,
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

    navigation.navigate(Routes.HW.HARDWARE_WALLET_DISCOVERY, {
      walletType: HardwareWalletType.Qr,
      initialStep: 'accounts',
    });
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

    navigation.navigate(Routes.HW.HARDWARE_WALLET_DISCOVERY, {
      walletType: HardwareWalletType.Ledger,
    });
  };

  const navigateToSearchingPreview = () => {
    navigation.navigate(Routes.HW.SEARCHING_FOR_DEVICE_PREVIEW);
  };

  const navigateToDiscoveryPreview = () => {
    navigation.navigate(Routes.HW.HARDWARE_WALLET_DISCOVERY, {
      walletType: HardwareWalletType.Ledger,
    });
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
      title: strings('connect_hardware.other_qr_wallet'),
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
      <View style={styles.contentContainer}>
        <View style={styles.buttonsContainer}>
          {hardwareOptions.map(renderHardwareButton)}
        </View>
        <View style={styles.previewButton}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={navigateToSearchingPreview}
            testID="hw-device-preview-button"
          >
            {strings('connect_hardware.preview_loading_screen')}
          </Button>
        </View>
        <View style={styles.previewButton}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={navigateToDiscoveryPreview}
            testID="hw-ledger-discovery-preview-button"
          >
            {strings('connect_hardware.preview_ledger_discovery')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SelectHardwareWallet;
