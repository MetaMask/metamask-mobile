// Third party dependencies
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, useWindowDimensions } from 'react-native';
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
  const { height: screenHeight } = useWindowDimensions();
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
    if (onRender) onRender();
  }, [onRender]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>{headerTitle}</Text>
    </View>
  );

  const onPress = () => {
    if (onAccept) onAccept();

    navigation.goBack();
  };

  return (
    <ReusableModal style={styles.screen}>
      <View style={styles.modal}>
        {renderHeader()}

        <View style={styles.bodyContainer}>
          {body.source === 'WebView' ? (
            <View style={{ height: screenHeight / 2 }}>
              <WebView source={{ uri: body.uri }} />
            </View>
          ) : (
            body.component()
          )}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={handleSelect}
            activeOpacity={1}
          >
            <Checkbox isSelected={isCheckboxSelected} />

            <Text style={styles.checkboxText}>{checkboxText}</Text>
          </TouchableOpacity>

          <View style={styles.confirmButtonContainer}>
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
            {footerHelpText ? (
              <Text style={styles.footerHelpText}>{footerHelpText}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </ReusableModal>
  );
};

export default ModalMandatory;
