import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBase,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneyNavigationParamList } from '../../types/navigation';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountMusdRescueSend from '../../hooks/useMoneyAccountMusdRescueSend';
import useMusdRescueRecipients from '../../hooks/useMusdRescueRecipients';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { MusdRescueSendTestIds } from './testIds';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { getNetworkImageSource } from '../../../../../util/networks';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';

/**
 * Final-approval screen for the liquid-mUSD rescue send. The amount is always
 * the full liquid mUSD balance — it cannot be edited here.
 */
const MusdRescueSendScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { params } =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyMusdRescueSend'>>();

  const { liquidMusd, isBalanceLoading, isBalanceFetchError } =
    useMoneyAccountBalance();
  const { recipients } = useMusdRescueRecipients();
  const { initiateRescueSend } = useMoneyAccountMusdRescueSend();

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_TRANSFER_MONEY_SHEET,
  });
  useMountEffect(trackBottomSheetViewed);

  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = useMemo(
    () => getAvatarAccountVariant(avatarAccountType),
    [avatarAccountType],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  // Set synchronously on entry so a second tap cannot start a second
  // submission while the first is still resolving.
  const isSubmitInFlightRef = useRef(false);

  const isBalanceUnavailable = isBalanceLoading || isBalanceFetchError;
  const amount = liquidMusd?.toString() ?? '';

  // Resolve the selected recipient by id from route params. Stale or foreign
  // ids (e.g. after accounts change) resolve to nothing and disable Send.
  const selectedRecipient = useMemo(
    () =>
      recipients.find((candidate) => candidate.id === params?.recipientId) ??
      recipients[0],
    [recipients, params?.recipientId],
  );

  const amountFiat =
    !isBalanceUnavailable && liquidMusd
      ? moneyFormatUsd(liquidMusd)
      : undefined;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSelectRecipient = useCallback(() => {
    navigation.navigate(Routes.MONEY.MUSD_RESCUE_RECIPIENT, {
      selectedRecipientId: selectedRecipient?.id,
    });
  }, [navigation, selectedRecipient?.id]);

  const handleSend = useCallback(async () => {
    setErrorMessage(undefined);

    if (isSubmitInFlightRef.current) {
      return;
    }
    if (!selectedRecipient) {
      setErrorMessage(
        strings('money.musd_rescue_send.error_invalid_recipient'),
      );
      return;
    }
    if (isBalanceUnavailable) {
      setErrorMessage(
        strings('money.musd_rescue_send.error_balance_unavailable'),
      );
      return;
    }
    const amountValue = new BigNumber(amount);
    if (!liquidMusd || !amountValue.isFinite() || amountValue.lte(0)) {
      setErrorMessage(strings('money.musd_rescue_send.error_invalid_amount'));
      return;
    }

    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_TRANSFER_MONEY_SHEET_SEND_EXTERNAL,
      redirect_target: SCREEN_NAMES.MONEY_TRANSFER,
    });

    isSubmitInFlightRef.current = true;
    setIsSubmitting(true);
    try {
      await initiateRescueSend({
        recipient: selectedRecipient.address,
        amount,
        sameSrpAddresses: recipients.map((candidate) => candidate.address),
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'reason' in error &&
        error.reason === 'vmusd-balance-present'
      ) {
        setErrorMessage(
          strings('money.musd_rescue_send.error_vmusd_balance_present'),
        );
      } else {
        setErrorMessage(strings('money.musd_rescue_send.error_send_failed'));
      }
    } finally {
      isSubmitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    amount,
    initiateRescueSend,
    isBalanceUnavailable,
    liquidMusd,
    selectedRecipient,
    recipients,
    trackSurfaceClicked,
  ]);

  const isSendDisabled =
    isSubmitting ||
    !selectedRecipient ||
    isBalanceUnavailable ||
    !liquidMusd?.gt(0);

  const renderSummaryRow = ({
    label,
    children,
    testID,
  }: {
    label: string;
    children: React.ReactNode;
    testID: string;
  }) => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="py-2"
      testID={testID}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Regular}
        color={TextColor.TextAlternative}
      >
        {label}
      </Text>
      {children}
    </Box>
  );

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ paddingTop: insets.top }}
      testID={MusdRescueSendTestIds.CONTAINER}
    >
      <HeaderStandard
        title={strings('money.musd_rescue_send.title')}
        onBack={handleGoBack}
        backButtonProps={{ testID: MusdRescueSendTestIds.BACK_BUTTON }}
      />

      <Box twClassName="flex-1 gap-6 px-4 pt-8">
        <Box twClassName="flex-1 items-center justify-center">
          <Text
            variant={TextVariant.DisplayLg}
            fontWeight={FontWeight.Bold}
            adjustsFontSizeToFit
            numberOfLines={1}
            twClassName="w-full text-center"
            testID={MusdRescueSendTestIds.AMOUNT}
            accessibilityLabel={strings('money.musd_rescue_send.receive_label')}
          >
            {amountFiat ??
              strings('money.musd_rescue_send.error_balance_unavailable')}
          </Text>
        </Box>

        <BannerAlert
          severity={BannerAlertSeverity.Info}
          title={strings('money.musd_rescue_send.your_funds_are_safe_title')}
          description={strings(
            'money.musd_rescue_send.your_funds_are_safe_description',
            { amount: amountFiat ?? '' },
          )}
          testID={MusdRescueSendTestIds.BANNER}
        />

        <Box twClassName="flex-1" />
      </Box>

      <Box twClassName="px-4 pb-4">
        {renderSummaryRow({
          label: strings('money.musd_rescue_send.to_label'),
          testID: MusdRescueSendTestIds.TO_ROW,
          children: (
            <ButtonBase
              onPress={handleSelectRecipient}
              testID={`${MusdRescueSendTestIds.TO_ROW}-pressable`}
              accessibilityLabel={strings(
                'money.musd_rescue_send.recipient_label',
              )}
              twClassName="flex-row items-center gap-3 bg-transparent px-0 py-1"
            >
              {selectedRecipient ? (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-2"
                >
                  <AvatarAccount
                    address={selectedRecipient.address}
                    size={AvatarAccountSize.Xs}
                    variant={avatarVariant}
                  />
                  <Text variant={TextVariant.BodyMd}>
                    {selectedRecipient.groupName ||
                      selectedRecipient.name ||
                      selectedRecipient.address}
                  </Text>
                </Box>
              ) : (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('money.musd_rescue_send.recipient_placeholder')}
                </Text>
              )}
              <Icon name={IconName.ArrowDown} size={IconSize.Xs} />
            </ButtonBase>
          ),
        })}

        {renderSummaryRow({
          label: strings('money.musd_rescue_send.receive_label'),
          testID: MusdRescueSendTestIds.RECEIVE_ROW,
          children: (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              <BadgeWrapper
                position={BadgeWrapperPosition.BottomRight}
                badge={
                  <BadgeNetwork
                    src={
                      getNetworkImageSource({
                        chainId: CHAIN_IDS.MONAD,
                      }) as React.ComponentProps<typeof BadgeNetwork>['src']
                    }
                    style={{ transform: [{ scale: 0.75 }] }}
                  />
                }
              >
                <AvatarToken
                  name={MUSD_TOKEN.symbol}
                  src={
                    MUSD_TOKEN.imageSource as React.ComponentProps<
                      typeof AvatarToken
                    >['src']
                  }
                  size={AvatarTokenSize.Xs}
                />
              </BadgeWrapper>
              <Text variant={TextVariant.BodyMd}>mUSD</Text>
            </Box>
          ),
        })}

        {renderSummaryRow({
          label: strings('money.musd_rescue_send.est_time_label'),
          testID: `${MusdRescueSendTestIds.RECEIVE_ROW}-est-time`,
          children: (
            <Text variant={TextVariant.BodyMd}>
              {strings('money.musd_rescue_send.est_time_value')}
            </Text>
          ),
        })}

        {renderSummaryRow({
          label: strings('money.musd_rescue_send.transaction_fees_label'),
          testID: `${MusdRescueSendTestIds.RECEIVE_ROW}-fees`,
          children: (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <Icon
                name={IconName.CheckBold}
                size={IconSize.Xs}
                color={IconColor.SuccessDefault}
              />
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.SuccessDefault}
              >
                {strings('money.musd_rescue_send.paid_by_metamask')}
              </Text>
            </Box>
          ),
        })}

        {renderSummaryRow({
          label: strings('money.musd_rescue_send.you_ll_receive_label'),
          testID: `${MusdRescueSendTestIds.RECEIVE_ROW}-youll-receive`,
          children: (
            <Text variant={TextVariant.BodyMd}>{amountFiat ?? ''}</Text>
          ),
        })}

        {errorMessage ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            accessibilityLiveRegion="polite"
            testID={MusdRescueSendTestIds.ERROR_MESSAGE}
          >
            {errorMessage}
          </Text>
        ) : null}

        <Box style={{ paddingBottom: insets.bottom + 12 }} twClassName="pt-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleSend}
            isDisabled={isSendDisabled}
            isLoading={isSubmitting}
            testID={MusdRescueSendTestIds.SEND_BUTTON}
          >
            {strings('money.musd_rescue_send.send')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default MusdRescueSendScreen;
