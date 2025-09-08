import React, { useEffect, useMemo, useState } from 'react';
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
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';

import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';

const ProtectWalletMandatoryModal = () => {
  const [showProtectWalletModal, setShowProtectWalletModal] = useState(false);
  const theme = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const metrics = useMetrics();

  const hasAnyTokenBalance = useSelector(selectHasAnyBalance);
  const allTokens = useSelector(selectAllTokens);
  const nfts = useSelector(selectAllNfts);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  const { navigate, dangerouslyGetState } = useNavigation();

  const passwordSet = useSelector(selectPasswordSet);
  const seedphraseBackedUp = useSelector(selectSeedphraseBackedUp);
  useEffect(() => {
    const route = findRouteNameFromNavigatorState(dangerouslyGetState().routes);
    if (isSeedlessOnboardingLoginFlow) {
      setShowProtectWalletModal(false);
      return;
    }

    if (!passwordSet || !seedphraseBackedUp) {
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

      // valid if passwordSet is still needed to check here
      if (Engine.hasFunds() || !passwordSet) {
        setShowProtectWalletModal(true);

        metrics.trackEvent(
          metrics
            .createEventBuilder(
              MetaMetricsEvents.WALLET_SECURITY_PROTECT_VIEWED,
            )
            .addProperties({
              wallet_protection_required: false,
              source: 'Backup Alert',
            })
            .build(),
        );
      } else {
        setShowProtectWalletModal(false);
      }
    } else {
      setShowProtectWalletModal(false);
    }
    // We need to add the dependencies to trigger the effect when the wallet have ballance
    // Dependencies added: hasAnyTokenBalance, allTokens, nfts, selectedAddress
  }, [
    metrics,
    passwordSet,
    seedphraseBackedUp,
    dangerouslyGetState,
    hasAnyTokenBalance,
    allTokens,
    nfts,
    selectedAddress,
    isSeedlessOnboardingLoginFlow,
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
