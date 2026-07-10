import React, { useCallback, useContext, useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CommonActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import QRCode from 'react-native-qrcode-svg';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../locales/i18n';
import ClipboardManager from '../../../core/ClipboardManager';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { getNetworkImageSource } from '../../../util/networks';

export interface OnboardingReceiveQRParams {
  tokenSymbol: string;
  networkName: string;
  chainId: string;
  address: string;
}

type ParamList = Record<string, OnboardingReceiveQRParams>;

const ADDRESS_PREFIX_LENGTH = 6;
const ADDRESS_SUFFIX_LENGTH = 4;

const OnboardingReceiveQR = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, 'OnboardingReceiveQR'>>();
  const { tokenSymbol, networkName, chainId, address } = route.params;
  const { toastRef } = useContext(ToastContext);

  const networkImageSource = useMemo(
    () => getNetworkImageSource({ chainId }),
    [chainId],
  );

  const formattedAddress = useMemo(() => {
    const start = address ? address.substring(0, ADDRESS_PREFIX_LENGTH) : '';
    const middle = address
      ? address.substring(
          ADDRESS_PREFIX_LENGTH,
          address.length - ADDRESS_SUFFIX_LENGTH,
        )
      : '';
    const end = address
      ? address.substring(address.length - ADDRESS_SUFFIX_LENGTH)
      : '';
    return { start, middle, end };
  }, [address]);

  const handleCopyAddress = useCallback(async () => {
    await ClipboardManager.setString(address);
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings('notifications.address_copied_to_clipboard'),
          isBold: false,
        },
      ],
      hasNoTimeout: false,
    });
  }, [address, toastRef]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDone = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
      }),
    );
  }, [navigation]);

  return (
    <View style={tw.style('flex-1')} testID="onboarding-receive-qr-screen">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderCompactStandard
          includesTopInset
          onBack={handleBack}
          backButtonProps={{ testID: 'onboarding-receive-qr-back' }}
          title={`Deposit ${tokenSymbol}`}
        />

        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 px-6 pt-8"
        >
          {address ? (
            <Box twClassName="p-6 border border-muted rounded-2xl bg-white">
              <QRCode
                value={address}
                size={200}
                logo={networkImageSource}
                logoSize={32}
                logoBorderRadius={8}
              />
            </Box>
          ) : null}

          <Box twClassName="mt-6 items-center">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center px-4"
            >
              {strings(
                'multichain_accounts.share_address_qr.description_prefix',
              )}{' '}
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {networkName}
              </Text>
            </Text>
          </Box>

          <Box twClassName="mt-6 items-center">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="w-[220px] text-center self-center"
            >
              {formattedAddress.start}
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {formattedAddress.middle}
              </Text>
              {formattedAddress.end}
            </Text>
            <Box twClassName="mt-2">
              <Button
                variant={ButtonVariant.Tertiary}
                size={ButtonSize.Lg}
                testID="onboarding-receive-qr-copy-button"
                onPress={handleCopyAddress}
                startIconName={IconName.Copy}
              >
                {strings('receive_request.copy_address')}
              </Button>
            </Box>
          </Box>
        </Box>

        <Box twClassName="px-4 pb-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleDone}
            testID="onboarding-receive-qr-done-button"
          >
            {strings('onboarding_fund_wallet.done')}
          </Button>
        </Box>
      </SafeAreaView>
    </View>
  );
};

export default OnboardingReceiveQR;
