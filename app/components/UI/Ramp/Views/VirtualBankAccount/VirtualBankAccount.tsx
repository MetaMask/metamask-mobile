import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarIcon,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconName,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { selectKycControllerState } from '../../../../../selectors/kycController';
import { selectRampsAutoramps } from '../../../../../selectors/rampsController';
import { VirtualBankAccountSelectorsIDs } from './VirtualBankAccount.testIds';
import { NeobankWebSocket } from './neobank/NeobankWebSocket';

/**
 * Virtual Bank Account status screen. Entered at the end of the neo-bank KYC
 * flow, once the autoramp has been created. Holds a neo-bank websocket open
 * while focused and reconciles against remote on focus, so a status change
 * that landed while the app was closed still surfaces.
 */
const VirtualBankAccount = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const walletAddress = useSelector(selectSelectedInternalAccountAddress);
  const autoramps = useSelector(selectRampsAutoramps);
  const kycState = useSelector(selectKycControllerState);
  const previousStatusesRef = useRef<Record<string, string>>({});

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [lastPushAt, setLastPushAt] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const customerId =
    autoramps[0]?.customerId ?? kycState.moonpayCustomerId ?? null;

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const catchUpFromRemote = useCallback(async () => {
    const { RampsController } = Engine.context;
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      await RampsController.syncAutorampsWithUserStorage();
      const before = RampsController.state.autoramps.map((account) => ({
        id: account.id,
        status: account.status,
        lastSeenStatus: account.lastSeenStatus,
        notifiedForStatus: account.notifiedForStatus,
      }));

      await RampsController.refreshAutoramps();

      const notable = RampsController.state.autoramps.filter((account) => {
        const prior = before.find((item) => item.id === account.id);
        if (!prior) {
          return false;
        }
        const changed = prior.status !== account.status;
        const unseen =
          account.notifiedForStatus !== account.status &&
          account.lastSeenStatus !== account.status;
        return changed || unseen;
      });

      if (notable.length > 0) {
        const first = notable[0];
        setStatusBanner(
          strings('virtual_bank_account.status_updated_while_away', {
            status: first.status,
            previous: first.lastSeenStatus,
          }),
        );
        for (const account of notable) {
          RampsController.markAutorampAsNotified(account.id);
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : strings('virtual_bank_account.refresh_failed'),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      catchUpFromRemote().catch(() => undefined);

      if (!customerId) {
        setWsConnected(false);
        return undefined;
      }

      const ws = NeobankWebSocket.getInstance();
      ws.connect(customerId);
      setWsConnected(true);

      const unsubscribe = ws.addListener(() => {
        setLastPushAt(Date.now());
      });

      return () => {
        unsubscribe();
        ws.disconnect();
        setWsConnected(false);
      };
    }, [catchUpFromRemote, customerId]),
  );

  useEffect(() => {
    for (const account of autoramps) {
      const previous = previousStatusesRef.current[account.id];
      if (previous && previous !== account.status) {
        setStatusBanner(
          strings('virtual_bank_account.status_changed', {
            status: account.status,
            previous,
          }),
        );
        if (account.notifiedForStatus !== account.status) {
          Engine.context.RampsController.markAutorampAsNotified(account.id);
        }
      }
      previousStatusesRef.current[account.id] = account.status;
    }
  }, [autoramps]);

  const primaryAutoramp = autoramps[0] ?? null;

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw`flex-1 bg-default`}
      testID={VirtualBankAccountSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title={strings('virtual_bank_account.title')}
        onBack={handleBackPress}
        backButtonProps={{
          testID: VirtualBankAccountSelectorsIDs.BACK_BUTTON,
        }}
      />
      <ScrollView contentContainerStyle={tw`gap-4 px-4 pb-8`}>
        <Box
          twClassName="items-center gap-3 pt-4"
          alignItems={BoxAlignItems.Center}
        >
          <AvatarIcon iconName={IconName.Bank} size={AvatarIconSize.Xl} />
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-center"
          >
            {strings('virtual_bank_account.heading')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-center text-alternative"
          >
            {strings('virtual_bank_account.description')}
          </Text>
          <Tag severity={wsConnected ? TagSeverity.Success : TagSeverity.Info}>
            {wsConnected
              ? strings('virtual_bank_account.ws_connected')
              : strings('virtual_bank_account.ws_disconnected')}
          </Tag>
        </Box>

        {statusBanner ? (
          <Box twClassName="rounded-lg bg-success-muted p-3">
            <Text variant={TextVariant.BodyMd}>{statusBanner}</Text>
          </Box>
        ) : null}

        {errorMessage ? (
          <Box twClassName="rounded-lg bg-error-muted p-3">
            <Text variant={TextVariant.BodyMd}>{errorMessage}</Text>
          </Box>
        ) : null}

        <Box twClassName="gap-2">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('virtual_bank_account.wallet_label')}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {walletAddress ?? strings('virtual_bank_account.missing_wallet')}
          </Text>
        </Box>

        <Box twClassName="gap-2">
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Medium}>
            {strings('virtual_bank_account.account_status_heading')}
          </Text>
          {primaryAutoramp ? (
            <Box
              flexDirection={BoxFlexDirection.Column}
              twClassName="gap-1 rounded-lg border border-muted p-3"
              testID={VirtualBankAccountSelectorsIDs.STATUS_CARD}
            >
              <Text variant={TextVariant.BodyMd}>
                {strings('virtual_bank_account.autoramp_id', {
                  id: primaryAutoramp.id,
                })}
              </Text>
              <Text variant={TextVariant.BodyMd}>
                {strings('virtual_bank_account.current_status', {
                  status: primaryAutoramp.status,
                })}
              </Text>
              <Text variant={TextVariant.BodySm} twClassName="text-alternative">
                {strings('virtual_bank_account.last_seen_status', {
                  status: primaryAutoramp.lastSeenStatus,
                })}
              </Text>
              {lastPushAt ? (
                <Text
                  variant={TextVariant.BodySm}
                  twClassName="text-alternative"
                >
                  {strings('virtual_bank_account.last_ws_push', {
                    time: new Date(lastPushAt).toLocaleTimeString(),
                  })}
                </Text>
              ) : null}
            </Box>
          ) : (
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {strings('virtual_bank_account.no_autoramp')}
            </Text>
          )}

          {autoramps.length > 1 ? (
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('virtual_bank_account.additional_count', {
                count: autoramps.length - 1,
              })}
            </Text>
          ) : null}
        </Box>

        <Button
          variant={ButtonVariant.Secondary}
          onPress={catchUpFromRemote}
          isDisabled={isRefreshing}
          isLoading={isRefreshing}
          testID={VirtualBankAccountSelectorsIDs.REFRESH_BUTTON}
        >
          {strings('virtual_bank_account.refresh_button')}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VirtualBankAccount;
