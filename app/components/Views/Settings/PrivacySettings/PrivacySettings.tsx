import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  FontWeight,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import Routes from '../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { DeleteMetaMetricsData } from '../SecuritySettings/Sections';
import MetaMetricsAndDataCollectionSection from '../SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import { useTheme } from '../../../../util/theme';

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 64 },
  sectionTitle: { marginTop: 32, marginBottom: 4 },
  firstSetting: { marginTop: 8 },
});

const PrivacySettings = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { isEnabled } = useAnalytics();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.wrapper, { backgroundColor: colors.background.default }]}
    >
      <HeaderStandard
        title={strings('app_settings.privacy_heading')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.firstSetting}>
          <BasicFunctionalityComponent
            flushTop
            handleSwitchToggle={() =>
              navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                screen: Routes.SHEET.BASIC_FUNCTIONALITY,
              })
            }
          />
        </View>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          style={styles.sectionTitle}
        >
          {strings('app_settings.analytics_subheading')}
        </Text>
        <MetaMetricsAndDataCollectionSection />
        <DeleteMetaMetricsData metricsOptin={isEnabled()} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacySettings;
