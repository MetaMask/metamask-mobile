import React, { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandard,
  IconName,
  KeyValueRow,
  SectionHeader,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { useTheme } from '../../../../../util/theme';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectPrimaryMoneyAccountUpgradeRecord } from '../../../../../selectors/moneyAccountUpgradeController';
import useMoneyAccountChompStatus from '../../hooks/useMoneyAccountChompStatus';
import {
  getAssociationStatus,
  getIntentsStatus,
  getLocalUpgradeStatus,
  getRegistrationSummary,
  getUpgradeStatus,
  MoneyAccountRegistrationSummary,
  RegistrationSignalStatus,
} from '../../utils/moneyAccountRegistrationStatus';
import { MoneyAccountStatusViewTestIds } from './MoneyAccountStatusView.testIds';

const SIGNAL_SEVERITY: Record<RegistrationSignalStatus, TagSeverity> = {
  [RegistrationSignalStatus.Complete]: TagSeverity.Success,
  [RegistrationSignalStatus.Pending]: TagSeverity.Warning,
  [RegistrationSignalStatus.Missing]: TagSeverity.Danger,
  [RegistrationSignalStatus.Unknown]: TagSeverity.Neutral,
};

const SUMMARY_SEVERITY: Record<MoneyAccountRegistrationSummary, TagSeverity> = {
  [MoneyAccountRegistrationSummary.Registered]: TagSeverity.Success,
  [MoneyAccountRegistrationSummary.Pending]: TagSeverity.Warning,
  [MoneyAccountRegistrationSummary.Incomplete]: TagSeverity.Danger,
  [MoneyAccountRegistrationSummary.Unknown]: TagSeverity.Neutral,
};

const StatusTag = ({
  severity,
  label,
}: {
  severity: TagSeverity;
  label: string;
}) => <Tag severity={severity}>{label}</Tag>;

const LoadingValue = () => (
  <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
    {strings('money.account_status.loading')}
  </Text>
);

const SignalRow = ({
  label,
  status,
  testID,
}: {
  label: string;
  status: RegistrationSignalStatus | undefined;
  testID: string;
}) => (
  <KeyValueRow
    testID={testID}
    keyLabel={label}
    value={
      status ? (
        <StatusTag
          severity={SIGNAL_SEVERITY[status]}
          label={strings(`money.account_status.signal.${status}`)}
        />
      ) : (
        <LoadingValue />
      )
    }
  />
);

const MoneyAccountStatusView = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const upgradeRecord = useSelector(selectPrimaryMoneyAccountUpgradeRecord);
  const address = primaryMoneyAccount?.address as Hex | undefined;
  const { signals, isRefreshing, refresh } =
    useMoneyAccountChompStatus(address);

  const handleCopyAddress = useCallback(async () => {
    if (address) {
      await ClipboardManager.setString(address);
    }
  }, [address]);

  const associationStatus = signals
    ? getAssociationStatus(signals.isAddressAssociated)
    : undefined;
  const upgradeStatus = signals
    ? getUpgradeStatus(signals.upgrades)
    : undefined;
  const intentsStatus = signals ? getIntentsStatus(signals.intents) : undefined;
  const localUpgradeStatus = getLocalUpgradeStatus(upgradeRecord);
  const summary =
    associationStatus && upgradeStatus && intentsStatus
      ? getRegistrationSummary([
          associationStatus,
          upgradeStatus,
          intentsStatus,
          localUpgradeStatus,
        ])
      : undefined;
  const hasRequestError =
    signals !== undefined &&
    Object.values(signals).some((result) => result.status === 'error');

  return (
    <Box
      testID={MoneyAccountStatusViewTestIds.CONTAINER}
      twClassName="flex-1 bg-default"
      style={{ paddingTop: insets.top }}
    >
      <HeaderStandard
        title={strings('money.account_status.title')}
        onBack={navigation.goBack}
        backButtonProps={{ testID: MoneyAccountStatusViewTestIds.BACK_BUTTON }}
      />
      <ScrollView
        testID={MoneyAccountStatusViewTestIds.SCROLL_VIEW}
        contentContainerStyle={tw.style('px-4 gap-4', {
          paddingBottom: insets.bottom + 16,
        })}
        refreshControl={
          address ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={colors.icon.default}
              colors={[colors.primary.default]}
            />
          ) : undefined
        }
      >
        {!address ? (
          <BannerAlert
            testID={MoneyAccountStatusViewTestIds.NO_ACCOUNT_BANNER}
            severity={BannerAlertSeverity.Warning}
            description={strings('money.account_status.no_account')}
          />
        ) : (
          <>
            <Box gap={1}>
              <SectionHeader
                title={strings('money.account_status.address_title')}
              />
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                gap={2}
              >
                <Text
                  testID={MoneyAccountStatusViewTestIds.ADDRESS}
                  variant={TextVariant.BodyMd}
                  twClassName="flex-1"
                  selectable
                >
                  {address}
                </Text>
                <ButtonIcon
                  testID={MoneyAccountStatusViewTestIds.COPY_ADDRESS_BUTTON}
                  iconName={IconName.Copy}
                  size={ButtonIconSize.Md}
                  onPress={handleCopyAddress}
                  accessibilityLabel={strings(
                    'money.account_status.copy_address',
                  )}
                />
              </Box>
            </Box>

            <Box gap={1}>
              <SectionHeader
                title={strings('money.account_status.summary_title')}
              />
              <KeyValueRow
                testID={MoneyAccountStatusViewTestIds.SUMMARY}
                keyLabel={strings('money.account_status.chomp_registration')}
                value={
                  summary ? (
                    <StatusTag
                      severity={SUMMARY_SEVERITY[summary]}
                      label={strings(`money.account_status.summary.${summary}`)}
                    />
                  ) : (
                    <LoadingValue />
                  )
                }
              />
            </Box>

            {hasRequestError && (
              <BannerAlert
                testID={MoneyAccountStatusViewTestIds.ERROR_BANNER}
                severity={BannerAlertSeverity.Danger}
                description={strings('money.account_status.request_error')}
              />
            )}

            <Box gap={1}>
              <SectionHeader
                title={strings('money.account_status.signals_title')}
              />
              <SignalRow
                testID={MoneyAccountStatusViewTestIds.ASSOCIATION_ROW}
                label={strings('money.account_status.profile_association')}
                status={associationStatus}
              />
              <SignalRow
                testID={MoneyAccountStatusViewTestIds.UPGRADE_ROW}
                label={strings('money.account_status.account_upgrade')}
                status={upgradeStatus}
              />
              <SignalRow
                testID={MoneyAccountStatusViewTestIds.INTENTS_ROW}
                label={strings('money.account_status.intents')}
                status={intentsStatus}
              />
              <SignalRow
                testID={MoneyAccountStatusViewTestIds.LOCAL_RECORD_ROW}
                label={strings('money.account_status.local_record')}
                status={localUpgradeStatus}
              />
              {upgradeRecord && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('money.account_status.local_record_completed_at', {
                    date: new Date(upgradeRecord.completedAt).toLocaleString(),
                  })}
                </Text>
              )}
            </Box>

            {signals?.upgrades.status === 'success' &&
              signals.upgrades.data.length > 0 && (
                <Box gap={1}>
                  <SectionHeader
                    title={strings('money.account_status.upgrades_title')}
                  />
                  {signals.upgrades.data.map((upgrade) => (
                    <KeyValueRow
                      key={`${upgrade.chainId}-${upgrade.nonce}`}
                      testID={`${MoneyAccountStatusViewTestIds.UPGRADE_ENTRY}-${upgrade.chainId}`}
                      keyLabel={strings('money.account_status.chain', {
                        chainId: upgrade.chainId,
                      })}
                      value={
                        <StatusTag
                          severity={
                            upgrade.status === 'upgraded'
                              ? TagSeverity.Success
                              : TagSeverity.Warning
                          }
                          label={upgrade.status}
                        />
                      }
                    />
                  ))}
                </Box>
              )}

            {signals?.intents.status === 'success' &&
              signals.intents.data.length > 0 && (
                <Box gap={1}>
                  <SectionHeader
                    title={strings('money.account_status.intents_title')}
                  />
                  {signals.intents.data.map((intent) => (
                    <KeyValueRow
                      key={intent.delegationHash}
                      testID={`${MoneyAccountStatusViewTestIds.INTENT_ENTRY}-${intent.delegationHash}`}
                      keyLabel={`${intent.metadata.tokenSymbol} · ${intent.metadata.type}`}
                      value={
                        <StatusTag
                          severity={
                            intent.status === 'active'
                              ? TagSeverity.Success
                              : TagSeverity.Neutral
                          }
                          label={intent.status}
                        />
                      }
                    />
                  ))}
                </Box>
              )}
          </>
        )}
      </ScrollView>
    </Box>
  );
};

export default MoneyAccountStatusView;
