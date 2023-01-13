// Third party dependencies
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import ButtonPrimary from '../../Buttons/Button/variants/ButtonPrimary';
import Text from '../../Texts/Text';
import { useStyles } from '../../../hooks';
import { useTheme } from '../../../../util/theme';
import ReusableModal from '../../../../components/UI/ReusableModal';
import Checkbox from '../../../../component-library/components/Checkbox';

// Internal dependencies
import { MandatoryModalProps } from './ModalMandatory.types';
import stylesheet from './ModalMandatory.styles';

const ModalMandatory = ({ route }: MandatoryModalProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(stylesheet, {});
  const navigation = useNavigation();

  const [isCheckboxSelected, setIsCheckboxSelected] = useState<boolean>(false);
  const handleSelect = () => {
    setIsCheckboxSelected(!isCheckboxSelected);
  };

  const {
    headerTitle,
    footerHelpText,
    buttonText,
    body,
    onAccept,
    checkboxText,
    onRender,
  } = route.params;

  useEffect(() => {
    onRender?.();
  }, [onRender]);

  const renderHeader = () => (
    <Text style={styles.headerText}>{headerTitle}</Text>
  );

  const onPress = () => {
    onAccept?.();

    navigation.goBack();
  };

  const renderWebView = (uri: string) => (
    <View style={styles.webView}>
      <WebView source={{ uri: uri }} />
    </View>
  );

  return (
    <ReusableModal style={styles.screen}>
      <View style={styles.modal}>
        {renderHeader()}
        {body.source === 'WebView' ? renderWebView(body.uri) : body.component()}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={handleSelect}
          activeOpacity={1}
        >
          <Checkbox isSelected={isCheckboxSelected} />
          <Text style={styles.checkboxText}>{checkboxText}</Text>
        </TouchableOpacity>
        <ButtonPrimary
          label={buttonText}
          disabled={!isCheckboxSelected}
          style={{
            ...styles.confirmButton,
            ...{
              backgroundColor: !isCheckboxSelected
                ? colors.primary.muted
                : colors.primary.default,
            },
          }}
          onPress={onPress}
        />
        {!!footerHelpText ? (
          <Text style={styles.footerHelpText}>{footerHelpText}</Text>
        ) : null}
      </View>
    </ReusableModal>
  );
};

export default ModalMandatory;
