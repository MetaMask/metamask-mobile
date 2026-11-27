/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StorageWrapper from '../../../../store/storage-wrapper';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { strings } from '../../../../../locales/i18n';
import { SEED_PHRASE_HINTS } from '../../../../constants/storage';
import HintModal from '../../../UI/HintModal';
import {
  ProtectYourWallet,
  DeviceSecurityToggle,
  ChangePassword,
  MfaSection,
  AutoLock,
  BlockaidSettings,
} from './Sections';
import { SecurityPrivacyViewSelectorsIDs } from './SecurityPrivacyView.testIds';
import createStyles from './SecuritySettings.styles';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import useCheckNftAutoDetectionModal from '../../../hooks/useCheckNftAutoDetectionModal';
import useCheckMultiRpcModal from '../../../hooks/useCheckMultiRpcModal';
import { useStyles } from '../../../../component-library/hooks/useStyles';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

const Settings: React.FC = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<AppNavigationProp>();
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const isBasicFunctionalityConsolidationEnabled = useSelector(
    selectIsBasicFunctionalityConsolidationEnabled,
  );
  const seedphraseBackedUp = useSelector(
    (state: RootState) => state.user.seedphraseBackedUp,
  );

  /**
   * Shows Nft auto detect modal if the user is on mainnet, never saw the modal and have nft detection off
   */
  useCheckNftAutoDetectionModal();

  /**
   * Show multi rpc modal if there are networks duplicated and if never showed before
   */
  useCheckMultiRpcModal();

  const handleHintText = useCallback(async () => {
    const currentSeedphraseHints =
      await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    const parsedHints =
      currentSeedphraseHints && JSON.parse(currentSeedphraseHints);
    const manualBackup = parsedHints?.manualBackup;

    setHintText(manualBackup);
  }, []);

  useEffect(() => {
    void handleHintText();
  }, [handleHintText]);

  const toggleHint = () => {
    setShowHint(!showHint);
  };

  const saveHint = async () => {
    if (!hintText) return;
    toggleHint();
    const currentSeedphraseHints =
      await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    if (currentSeedphraseHints) {
      const parsedHints = JSON.parse(currentSeedphraseHints);
      await StorageWrapper.setItem(
        SEED_PHRASE_HINTS,
        JSON.stringify({ ...parsedHints, manualBackup: hintText }),
      );
    }
  };

  const handleChangeText = (text: string) => setHintText(text);

  const renderHint = () => (
    <HintModal
      onConfirm={saveHint}
      onCancel={toggleHint}
      modalVisible={showHint}
      onRequestClose={Keyboard.dismiss}
      value={hintText}
      onChangeText={handleChangeText}
    />
  );

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        testID="header"
        title={strings('app_settings.security_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL}
      >
        <View style={styles.inner}>
          <View style={[styles.setting, styles.firstSetting]}>
            <Text variant={TextVariant.HeadingMd} style={styles.heading}>
              {strings('app_settings.security_heading')}
            </Text>
          </View>
          <ProtectYourWallet
            srpBackedup={seedphraseBackedUp}
            hintText={hintText}
            toggleHint={toggleHint}
          />
          <ChangePassword />
          <MfaSection />
          <AutoLock />
          <DeviceSecurityToggle />
          {!isBasicFunctionalityConsolidationEnabled && <BlockaidSettings />}
          {renderHint()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
