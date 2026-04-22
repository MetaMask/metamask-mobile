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
import { Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import TitleStandard from '../../../../component-library/components-temp/TitleStandard';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { mockTheme, useAppThemeFromContext } from '../../../../util/theme';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';
import { HardwareDeviceTypes } from '../../../../constants/keyringTypes';
import { getConnectedDevicesCount } from '../../../../core/HardwareWallets/analytics';
import SelectHardwareTestIds from './SelectHardware.testIds';
import LedgerLogo from '../../../../images/hardware-ledger-logo.svg';
import KeystoneLogo from '../../../../images/hardware-keystone-logo.svg';
import oneKeyLogo from '../../../../images/hardware-onekey-logo.png';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyle = (colors: any) =>
  StyleSheet.create({
    screen: { justifyContent: 'center' },
    container: {
      flex: 1,
      justifyContent: 'center',
    },
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
    image: {
      width: 150,
      height: 75,
    },
    hardwareButton: {
      height: 125,
      flex: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.section,
    },
    button: {
      width: '100%',
    },
    previewButton: {
      width: '100%',
    },
    subtitle: {
      marginTop: 4,
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

const SelectHardwareWallet = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { colors } = useAppThemeFromContext() || mockTheme;
  const tw = useTailwind();

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

    navigation.navigate(Routes.HW.LEDGER_DISCOVERY);
  };

  const navigateToSearchingPreview = () => {
    navigation.navigate(Routes.HW.SEARCHING_FOR_DEVICE_PREVIEW);
  };

  const navigateToDiscoveryPreview = () => {
    navigation.navigate(Routes.HW.LEDGER_DISCOVERY);
  };

  const renderIconTile = (icon: ReactNode) => (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="h-10 w-10 rounded-xl bg-white"
    >
      {icon}
    </Box>
  );

  const hardwareOptions: HardwareOption[] = [
    {
      title: HardwareDeviceTypes.LEDGER,
      onPress: navigateToConnectLedger,
      testID: SelectHardwareTestIds.LEDGER_BUTTON,
      leadingIcon: renderIconTile(
        <LedgerLogo name="ledger-logo" width={24} height={24} />,
      ),
    },
    {
      title: 'Keystone',
      onPress: () => navigateToConnectQRWallet(),
      testID: SelectHardwareTestIds.KEYSTONE_BUTTON,
      leadingIcon: renderIconTile(
        <KeystoneLogo name="keystone-logo" width={24} height={22} />,
      ),
    },
    {
      title: 'OneKey',
      onPress: () => navigateToConnectQRWallet({ hideMarketingContent: true }),
      testID: SelectHardwareTestIds.ONEKEY_BUTTON,
      leadingIcon: (
        <Image
          source={oneKeyLogo}
          resizeMode="contain"
          style={tw.style('h-10 w-10 rounded-xl')}
        />
      ),
    },
    {
      title: 'Other QR wallet',
      onPress: () => navigateToConnectQRWallet({ hideMarketingContent: true }),
      testID: SelectHardwareTestIds.OTHER_QR_BUTTON,
      leadingIcon: renderIconTile(
        <Icon name={IconName.QrCode} size={IconSize.Md} />,
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
      <HeaderCompactStandard
        includesTopInset
        onBack={navigation.goBack}
        twClassName="px-3"
      />
      <TitleStandard
        title={strings('connect_hardware.title_select_hardware')}
        twClassName="px-4 pb-6"
      />
      <View style={styles.contentContainer}>
        <View style={styles.buttonsContainer}>
          <LedgerButton />
          <QRButton />
        </View>
        <View style={styles.previewButton}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={navigateToSearchingPreview}
            testID="hw-device-preview-button"
          >
            Preview loading screen
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
            Preview Ledger discovery flow
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SelectHardwareWallet;
