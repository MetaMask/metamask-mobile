import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  BottomSheet,
  BottomSheetRef,
  BottomSheetHeader,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { SDKConnectV2OtpModalParams } from './SDKConnectV2OtpModal.types';
import { SDKConnectV2OtpModalSelectors } from './SDKConnectV2OtpModal.testIds';

/**
 * Formats the OTP for display, inserting an en-dash in the middle of 8-char codes
 * (e.g. "4892AKJ7" -> "4892\u2013AKJ7"). Codes of other lengths are shown as-is.
 */
const formatOtp = (otp: string): string => {
  if (otp.length === 8 && !otp.includes('\u2013')) {
    return `${otp.slice(0, 4)}\u2013${otp.slice(4)}`;
  }
  return otp;
};

/**
 * Formats remaining seconds as MM:SS, clamped at 0.
 */
const formatCountdown = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

/**
 * Maximum window we surface to the user for entering the OTP, regardless of the
 * (longer) validity window reported by the wallet protocol's `display_otp` event.
 * Product spec is 1 minute.
 */
const OTP_DISPLAY_TIMEOUT_MS = 60_000;

const computeSecondsLeft = (effectiveDeadline: number): number =>
  Math.max(0, Math.ceil((effectiveDeadline - Date.now()) / 1000));

const SDKConnectV2OtpModal: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: SDKConnectV2OtpModalParams }, 'params'>>();
  const { otp, deadline } = route.params ?? { otp: '', deadline: 0 };

  // Pop the route once the close animation finishes; the design-system
  // BottomSheet does not navigate back on its own.
  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  // Cap the displayed deadline at OTP_DISPLAY_TIMEOUT_MS from mount so the
  // countdown always tops out at 1 minute, even if the protocol allows longer.
  const effectiveDeadline = useMemo(() => {
    const capped = Date.now() + OTP_DISPLAY_TIMEOUT_MS;
    return deadline > 0 ? Math.min(deadline, capped) : capped;
  }, [deadline]);

  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    computeSecondsLeft(effectiveDeadline),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      const remaining = computeSecondsLeft(effectiveDeadline);
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(intervalId);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [effectiveDeadline]);

  const isExpired = secondsLeft <= 0;
  const formattedOtp = useMemo(() => formatOtp(otp), [otp]);

  // Split the localized "Expires in {{time}}" template so we can color only
  // the countdown red while preserving translator-controlled word order.
  const [expiresBefore, expiresAfter] = strings(
    'sdk_connect_v2.show_otp.expires_in',
    { time: '\u0000' },
  ).split('\u0000');

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={goBack}
      testID={SDKConnectV2OtpModalSelectors.CONTAINER}
    >
      <BottomSheetHeader
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{
          testID: SDKConnectV2OtpModalSelectors.CLOSE_BUTTON,
        }}
      >
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {strings('sdk_connect_v2.show_otp.modal_title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4 gap-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('sdk_connect_v2.show_otp.modal_description')}
        </Text>

        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          backgroundColor={BoxBackgroundColor.BackgroundMuted}
          twClassName="rounded-lg py-4 px-4 gap-2"
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
          >
            {strings('sdk_connect_v2.show_otp.code_label')}
          </Text>
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            testID={SDKConnectV2OtpModalSelectors.OTP_CODE}
          >
            {formattedOtp}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={
              isExpired ? TextColor.ErrorDefault : TextColor.TextAlternative
            }
            testID={SDKConnectV2OtpModalSelectors.COUNTDOWN}
          >
            {isExpired ? (
              strings('sdk_connect_v2.show_otp.expired')
            ) : (
              <>
                {expiresBefore}
                <Text
                  color={TextColor.ErrorDefault}
                  fontWeight={FontWeight.Medium}
                >
                  {formatCountdown(secondsLeft)}
                </Text>
                {expiresAfter}
              </>
            )}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          backgroundColor={BoxBackgroundColor.WarningMuted}
          twClassName="rounded-lg p-3 gap-3"
          testID={SDKConnectV2OtpModalSelectors.SECURITY_NOTICE}
        >
          <Icon
            name={IconName.Lock}
            color={IconColor.WarningDefault}
            size={IconSize.Md}
          />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.WarningDefault}
            fontWeight={FontWeight.Medium}
            twClassName="flex-1"
          >
            {strings('sdk_connect_v2.show_otp.security_notice')}
          </Text>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default SDKConnectV2OtpModal;
