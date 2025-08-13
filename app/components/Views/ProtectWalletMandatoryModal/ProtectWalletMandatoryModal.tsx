import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, InteractionManager } from 'react-native';
import Modal from 'react-native-modal';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../../util/theme';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import createStyles from './ProtectWalletMandatoryModal.styles';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import {
  selectPasswordSet,
  selectSeedphraseBackedUp,
} from '../../../reducers/user';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { selectHasAnyBalance } from '../../../selectors/tokenBalancesController';
import { selectAllTokens } from '../../../selectors/tokensController';
import { selectAllNfts } from '../../../selectors/nftController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import type { InternalAccount } from '@metamask/keyring-internal-api';

import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { findRouteNameFromNavigatorState } from '../../../util/general';

import { selectKeyrings } from '../../../selectors/keyringController';
import { isMultichainWalletSnap } from '../../../core/SnapKeyring/utils/snaps';
import { SnapId } from '@metamask/snaps-sdk';
import { areAddressesEqual } from '../../../util/address';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';

const ProtectWalletMandatoryModal = () => {
  const [showProtectWalletModal, setShowProtectWalletModal] = useState(false);
  const theme = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const metrics = useMetrics();

  const hasAnyTokenBalance = useSelector(selectHasAnyBalance);
  const allTokens = useSelector(selectAllTokens);
  const nfts = useSelector(selectAllNfts);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const keyrings = useSelector(selectKeyrings);

  const { navigate, dangerouslyGetState } = useNavigation();

  const passwordSet = useSelector(selectPasswordSet);
  const seedphraseBackedUp = useSelector(selectSeedphraseBackedUp);
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  // Helper function to get keyring ID for any account (EVM or Solana)
  const getAccountKeyringId = useCallback(
    (account: InternalAccount | null): string | null => {
      if (!account) return null;

      // For Snap accounts (like Solana), use entropy source
      const isFirstPartySnap =
        account.metadata?.snap?.id &&
        isMultichainWalletSnap(account.metadata.snap.id as SnapId);

      if (isFirstPartySnap && account.options?.entropySource) {
        return account.options.entropySource as string;
      }

      // For regular accounts, find keyring by address
      const keyring = keyrings.find((kr) =>
        kr.accounts.some((address) =>
          areAddressesEqual(address, account.address),
        ),
      );

      return keyring?.metadata?.id || null;
    },
    [keyrings],
  );

  // Get HD keyring index for the selected account's keyring
  const selectedAccountKeyringId = selectedAccount
    ? getAccountKeyringId(selectedAccount)
    : null;

  const selectedAccountHdKeyringIndex = useMemo(() => {
    if (!selectedAccountKeyringId) return null; // Changed: return null for non-existent keyrings

    // Find the keyring with the matching ID in the original keyrings array
    const keyringIndex = keyrings.findIndex(
      (keyring) => keyring.metadata?.id === selectedAccountKeyringId,
    );

    // If keyring not found, return null
    if (keyringIndex === -1) return null;

    const keyring = keyrings[keyringIndex];

    // Only return an index for HD keyrings
    if (keyring.type !== ExtendedKeyringTypes.hd) return null;

    // Find the position among HD keyrings specifically
    // The primary HD keyring is the first HD keyring in the original order
    const hdKeyrings = keyrings.filter(
      (kr) => kr.type === ExtendedKeyringTypes.hd,
    );
    const hdIndex = hdKeyrings.findIndex(
      (hdKeyring) => hdKeyring.metadata?.id === selectedAccountKeyringId,
    );

    return hdIndex !== -1 ? hdIndex : null;
  }, [selectedAccountKeyringId, keyrings]);

  // Helper function to check if account belongs to primary SRP (index 0)
  const isPrimaryKeyringAccount = useCallback((): boolean => {
    if (!selectedAccount || selectedAccountKeyringId === null) return false;

    // Only HD accounts can be primary accounts
    if (selectedAccountHdKeyringIndex === null) return false;

    // Primary keyring has index 0 among HD keyrings
    return selectedAccountHdKeyringIndex === 0;
  }, [
    selectedAccount,
    selectedAccountKeyringId,
    selectedAccountHdKeyringIndex,
  ]);

  useEffect(() => {
    const route = findRouteNameFromNavigatorState(dangerouslyGetState().routes);

    // Early exit for social login flow
    if (isSocialLogin) {
      setShowProtectWalletModal(false);
      return;
    }

    // Early exit for restricted routes (cheapest check)
    if (
      [
        'SetPasswordFlow',
        'ChoosePassword',
        'AccountBackupStep1',
        'AccountBackupStep1B',
        'ManualBackupStep1',
        'ManualBackupStep2',
        'ManualBackupStep3',
        'Webview',
        Routes.LOCK_SCREEN,
      ].includes(route)
    ) {
      setShowProtectWalletModal(false);
      return;
    }

    // Check if selected account is from primary SRP first
    const isPrimaryAccount = isPrimaryKeyringAccount();
    if (!isPrimaryAccount) {
      setShowProtectWalletModal(false);
      return;
    }

    // Now check if this specific primary account has funds
    if (!Engine.hasFunds(selectedAccount?.address)) {
      setShowProtectWalletModal(false);
      return;
    }

    // Finally, check if seedphrase needs backup protection
    if (!seedphraseBackedUp) {
      setShowProtectWalletModal(true);

      metrics.trackEvent(
        metrics
          .createEventBuilder(MetaMetricsEvents.WALLET_SECURITY_PROTECT_VIEWED)
          .addProperties({
            wallet_protection_required: false,
            source: 'Backup Alert',
          })
          .build(),
      );
    } else {
      setShowProtectWalletModal(false);
    }

    // We need to add the dependencies to trigger the effect when the wallet have balance
    // Dependencies added: hasAnyTokenBalance, allTokens, nfts, selectedAccount, selectedAccountHdKeyringIndex
  }, [
    metrics,
    passwordSet,
    seedphraseBackedUp,
    dangerouslyGetState,
    hasAnyTokenBalance,
    allTokens,
    nfts,
    selectedAccount,
    selectedAccountHdKeyringIndex,
    isPrimaryKeyringAccount,
    isSocialLogin,
  ]);

  const onSecureWallet = () => {
    setShowProtectWalletModal(false);

    navigate(
      'SetPasswordFlow',
      passwordSet ? { screen: 'AccountBackupStep1' } : undefined,
    );
    InteractionManager.runAfterInteractions(() => {
      metrics.trackEvent(
        metrics
          .createEventBuilder(MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED)
          .addProperties({
            wallet_protection_required: true,
            source: 'Modal',
          })
          .build(),
      );
    });
  };

  return (
    <Modal
      isVisible={showProtectWalletModal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={theme.colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
    >
      <View style={styles.protectWalletContainer}>
        <View style={styles.protectWalletIconContainer}>
          <FeatherIcon
            style={styles.protectWalletIcon}
            name="alert-triangle"
            size={20}
          />
        </View>
        <Text style={styles.protectWalletTitle}>
          {strings('protect_your_wallet_modal.title')}
        </Text>
        <Text style={styles.protectWalletContent}>
          {!passwordSet
            ? strings('protect_your_wallet_modal.body_for_password')
            : strings('protect_your_wallet_modal.body_for_seedphrase')}
        </Text>
        <View style={styles.protectWalletButtonWrapper}>
          <StyledButton type="confirm" onPress={onSecureWallet}>
            {strings('protect_your_wallet_modal.button')}
          </StyledButton>
        </View>
      </View>
    </Modal>
  );
};

export default ProtectWalletMandatoryModal;
