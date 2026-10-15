import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import { clearHistory } from '../../../../actions/browser';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import ActionModal from '../../../UI/ActionModal';
import {
  ClearCookiesSection,
  ClearPrivacy,
} from '../SecuritySettings/Sections';

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 64 },
  setting: { marginTop: 24 },
  description: { marginTop: 8 },
  accessory: { marginTop: 16 },
  modalView: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalTitle: { textAlign: 'center', marginBottom: 20 },
  modalText: { textAlign: 'center' },
});

const BrowserSettings = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { isEnabled } = useAnalytics();
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const browserHistory = useSelector(
    (state: RootState) => state.browser.history,
  );
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  const handleClearHistory = () => {
    dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
    setHistoryModalVisible(false);
  };

  return (
    <SafeAreaView
      style={[styles.wrapper, { backgroundColor: colors.background.default }]}
    >
      <HeaderStandard
        title={strings('app_settings.entries.browser')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.setting}>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('app_settings.clear_browser_history_desc')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={styles.description}
          >
            {strings('app_settings.clear_history_desc')}
          </Text>
          <View style={styles.accessory}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={() => setHistoryModalVisible(true)}
              isDisabled={browserHistory.length === 0}
            >
              {strings('app_settings.clear_browser_history_desc')}
            </Button>
          </View>
        </View>
        <ClearCookiesSection />
        <ClearPrivacy />
      </ScrollView>
      <ActionModal
        modalVisible={historyModalVisible}
        confirmText={strings('app_settings.clear')}
        cancelText={strings('app_settings.reset_account_cancel_button')}
        onCancelPress={() => setHistoryModalVisible(false)}
        onRequestClose={() => setHistoryModalVisible(false)}
        onConfirmPress={handleClearHistory}
      >
        <View style={styles.modalView}>
          <Text variant={TextVariant.HeadingMd} style={styles.modalTitle}>
            {strings('app_settings.clear_browser_history_modal_title')}
          </Text>
          <Text variant={TextVariant.BodyMd} style={styles.modalText}>
            {strings('app_settings.clear_browser_history_modal_message')}
          </Text>
        </View>
      </ActionModal>
    </SafeAreaView>
  );
};

export default BrowserSettings;
