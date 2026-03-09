import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { Custodian } from '@metamask/eth-mpc-keyring';
import { AccountWalletId, AccountWalletType } from '@metamask/account-api';
import { selectWalletById } from '../../../../selectors/multichainAccounts/accountTreeController';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import { useTheme } from '../../../../util/theme';
import {
  addMpcCustodian,
  createMpcJoinData,
  getMpcCustodianId,
  getMpcCustodians,
} from '../../../../core/Engine/controllers/mpc-controller/mpc';

interface MpcWalletManagementRouteParams {
  id: string;
}

type MpcWalletManagementRouteProp = RouteProp<
  { params: MpcWalletManagementRouteParams },
  'params'
>;

export const MpcWalletManagementPage = () => {
  const tw = useTailwind();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<MpcWalletManagementRouteProp>();
  const { id } = route.params || {};

  const walletId = decodeURIComponent(id ?? '') as AccountWalletId;
  const wallet = useSelector(selectWalletById);

  const [custodians, setCustodians] = useState<Custodian[]>([]);
  const [selfCustodianId, setSelfCustodianId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add custodian flow state
  const [joinData, setJoinData] = useState<string | null>(null);
  const [isGeneratingJoinData, setIsGeneratingJoinData] = useState(false);
  const [isAddingCustodian, setIsAddingCustodian] = useState(false);

  // Passkeys toggle
  const [passkeysEnabled, setPasskeysEnabled] = useState(true);

  useEffect(() => {
    const loadPasskeysSetting = async () => {
      try {
        const value = await StorageWrapper.getItem('mpcPasskeysEnabled');
        setPasskeysEnabled(value !== 'false');
      } catch (err) {
        Logger.error(err as Error, 'Failed to load passkeys setting');
      }
    };
    loadPasskeysSetting();
  }, []);

  const walletObject = wallet(walletId);
  const keyringId =
    walletObject && walletObject.type === AccountWalletType.Keyring
      ? walletObject.metadata.keyring.id
      : undefined;

  const fetchCustodians = useCallback(async () => {
    if (!keyringId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [result, selfId] = await Promise.all([
        getMpcCustodians(keyringId),
        getMpcCustodianId(keyringId),
      ]);
      setCustodians(result);
      setSelfCustodianId(selfId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load custodians',
      );
      Logger.error(err as Error, 'Failed to load custodians');
    } finally {
      setLoading(false);
    }
  }, [keyringId]);

  useEffect(() => {
    if (!wallet) {
      navigation.navigate(Routes.SHEET.ACCOUNT_SELECTOR);
      return;
    }
    fetchCustodians();
  }, [wallet, navigation, fetchCustodians]);

  const handleGenerateJoinData = useCallback(async () => {
    if (!keyringId) {
      return;
    }
    setIsGeneratingJoinData(true);
    setError(null);
    try {
      const data = await createMpcJoinData(keyringId);
      setJoinData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate join data',
      );
      Logger.error(err as Error, 'Failed to generate join data');
    } finally {
      setIsGeneratingJoinData(false);
    }
  }, [keyringId]);

  const handleAddCustodian = useCallback(async () => {
    if (!keyringId || !joinData) {
      return;
    }
    setIsAddingCustodian(true);
    setError(null);
    try {
      await addMpcCustodian(keyringId, joinData);
      setJoinData(null);
      await fetchCustodians();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add custodian');
      Logger.error(err as Error, 'Failed to add custodian');
    } finally {
      setIsAddingCustodian(false);
    }
  }, [keyringId, joinData, fetchCustodians]);

  const handleTogglePasskeys = useCallback(async (value: boolean) => {
    setPasskeysEnabled(value);
    try {
      await StorageWrapper.setItem('mpcPasskeysEnabled', String(value));
    } catch (err) {
      Logger.error(err as Error, 'Failed to save passkeys setting');
    }
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.SHEET.ACCOUNT_SELECTOR);
    }
  }, [navigation]);

  const getCustodianIcon = (type: 'cloud' | 'user') =>
    type === 'cloud' ? IconName.Cloud : IconName.User;

  const getCustodianLabel = (type: 'cloud' | 'user') =>
    type === 'cloud'
      ? strings('multichain_accounts.mpc_wallet.cloud')
      : strings('multichain_accounts.mpc_wallet.user');

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      <SheetHeader
        title={
          walletObject?.metadata.name ??
          strings('multichain_accounts.mpc_wallet.manage_mpc_wallet')
        }
        onBack={handleBack}
      />
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 py-6')}
      >
        <Box flexDirection={BoxFlexDirection.Column} gap={3}>
          <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
            {strings('multichain_accounts.mpc_wallet.custodians')}
          </Text>

          {selfCustodianId && (
            <Box
              backgroundColor={BoxBackgroundColor.BackgroundMuted}
              twClassName="rounded-lg"
              padding={4}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                style={tw.style('mb-1')}
              >
                {strings('multichain_accounts.mpc_wallet.your_custodian_id')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                twClassName="break-all"
              >
                {selfCustodianId}
              </Text>
            </Box>
          )}

          {loading && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('multichain_accounts.mpc_wallet.loading')}
            </Text>
          )}

          {error && (
            <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
              {error}
            </Text>
          )}

          {!loading && custodians.length === 0 && !error && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('multichain_accounts.mpc_wallet.no_custodians')}
            </Text>
          )}

          {!loading && custodians.length > 0 && (
            <Box
              flexDirection={BoxFlexDirection.Column}
              backgroundColor={BoxBackgroundColor.BackgroundMuted}
              twClassName="rounded-lg"
            >
              {custodians.map((custodian, index) => (
                <Box
                  key={custodian.partyId}
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  padding={4}
                  gap={3}
                  style={
                    index < custodians.length - 1
                      ? tw.style('border-b border-muted')
                      : undefined
                  }
                >
                  <Icon
                    name={getCustodianIcon(custodian.type)}
                    size={IconSize.Md}
                    color={IconColor.IconAlternative}
                  />
                  <Box
                    flexDirection={BoxFlexDirection.Column}
                    twClassName="flex-1 min-w-0"
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextDefault}
                      numberOfLines={1}
                    >
                      {custodian.partyId}
                    </Text>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {getCustodianLabel(custodian.type)}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Passkeys toggle */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            backgroundColor={BoxBackgroundColor.BackgroundMuted}
            twClassName="rounded-lg"
            padding={4}
            marginTop={2}
          >
            <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1">
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('multichain_accounts.mpc_wallet.passkeys')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {passkeysEnabled
                  ? strings(
                      'multichain_accounts.mpc_wallet.passkeys_enabled_description',
                    )
                  : strings(
                      'multichain_accounts.mpc_wallet.passkeys_disabled_description',
                    )}
              </Text>
            </Box>
            <Switch
              value={passkeysEnabled}
              onValueChange={handleTogglePasskeys}
              trackColor={{
                true: theme.colors.primary.default,
                false: theme.colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              ios_backgroundColor={theme.colors.border.muted}
            />
          </Box>

          {/* Add custodian section */}
          <Box flexDirection={BoxFlexDirection.Column} gap={2} marginTop={2}>
            <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
              {strings('multichain_accounts.mpc_wallet.add_custodian')}
            </Text>

            {joinData ? (
              <>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'multichain_accounts.mpc_wallet.join_data_description',
                  )}
                </Text>
                <Box
                  backgroundColor={BoxBackgroundColor.BackgroundMuted}
                  twClassName="rounded-lg"
                  padding={4}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextDefault}
                    twClassName="break-all"
                  >
                    {joinData}
                  </Text>
                </Box>
                <Button
                  variant={ButtonVariant.Primary}
                  onPress={handleAddCustodian}
                  isDisabled={isAddingCustodian}
                  style={tw.style('w-full')}
                  testID="add-custodian-button"
                >
                  {isAddingCustodian
                    ? strings(
                        'multichain_accounts.mpc_wallet.waiting_for_custodian',
                      )
                    : strings('multichain_accounts.mpc_wallet.add_custodian')}
                </Button>
              </>
            ) : (
              <Button
                variant={ButtonVariant.Primary}
                onPress={handleGenerateJoinData}
                isDisabled={isGeneratingJoinData}
                style={tw.style('w-full')}
                testID="generate-join-data-button"
              >
                {isGeneratingJoinData
                  ? strings(
                      'multichain_accounts.mpc_wallet.generating_join_data',
                    )
                  : strings(
                      'multichain_accounts.mpc_wallet.generate_join_data',
                    )}
              </Button>
            )}
          </Box>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};
