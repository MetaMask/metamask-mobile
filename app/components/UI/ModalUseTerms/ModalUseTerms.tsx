import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { strings } from '../../../../locales/i18n';
import Text from '../../../component-library/components/Texts/Text';
import Checkbox from '../../../component-library/components/Checkbox';
import { useStyles } from '../../../component-library/hooks';
import { TRUE, USE_TERMS } from '../../../constants/storage';
import stylesheet from './ModalUseTerms.styles';
import { ModalUseTermsI } from './ModalUseTerms.types';
import ModalMandatory from '../../../component-library/components/Modals/ModalMandatory';
import AnalyticsV2 from '../../../util/analyticsV2';
import { TERMS_ACCEPTED, TERMS_DISPLAYED } from './ModalUseTerms.constants';

const ModalUseTerms = ({ onDismiss }: ModalUseTermsI) => {
  const { styles } = useStyles(stylesheet, {});

  const [isTermsSelected, setIsTermsSelected] = useState(false);

  useEffect(() => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.USER_TERMS, {
      value: TERMS_DISPLAYED,
    });
  }, []);

  const handleSelect = () => {
    setIsTermsSelected(!isTermsSelected);
  };

  const onConfirmUseTerms = async () => {
    await AsyncStorage.setItem(USE_TERMS, TRUE);
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.USER_TERMS, {
      value: TERMS_ACCEPTED,
    });
    onDismiss();
  };

  return (
    <ModalMandatory
      buttonText={strings('terms_of_use_modal.accept_cta')}
      buttonDisabled={!isTermsSelected}
      headerTitle={strings('terms_of_use_modal.title')}
      onPress={onConfirmUseTerms}
      footerHelpText={strings('terms_of_use_modal.accept_helper_description')}
    >
      <WebView source={{ uri: 'https://consensys.net/terms-of-use/' }} />
      <View style={styles.acceptTermsContainer}>
        <TouchableOpacity onPress={handleSelect} activeOpacity={1}>
          <Checkbox isSelected={isTermsSelected} style={styles.checkBox} />
        </TouchableOpacity>
        <Text style={styles.checkBoxText}>
          {strings('terms_of_use_modal.terms_of_use_check_description')}
        </Text>
      </View>
    </ModalMandatory>
  );
};

export default ModalUseTerms;
