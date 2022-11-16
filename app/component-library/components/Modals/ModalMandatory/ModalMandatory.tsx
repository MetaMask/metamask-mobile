import React from 'react';
import { View } from 'react-native';
import ElevatedView from 'react-native-elevated-view';
import ButtonPrimary from '../../Buttons/Button/variants/ButtonPrimary';
import Text from '../../Texts/Text';
import stylesheet from './ModalMandatory.styles';
import { useStyles } from '../../../hooks';
import { useTheme } from '../../../../util/theme';
import { ModalMandatoryI } from './ModalMandatory.types';

const ModalMandatory = ({
  headerTitle,
  onConfirm,
  footerHelpText,
  confirmDisabled,
  buttonText,
  children,
}: ModalMandatoryI) => {
  const { colors } = useTheme();
  const { styles } = useStyles(stylesheet, {});

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerText}>{headerTitle}</Text>
    </View>
  );

  return (
    <ElevatedView style={styles.screen}>
      <View style={styles.modal}>
        {renderHeader()}
        <View style={styles.bodyContainer}>
          {children}
          <View style={styles.confirmButtonContainer}>
            <ButtonPrimary
              label={buttonText}
              disabled={confirmDisabled}
              style={{
                ...styles.confirmButton,
                ...{
                  backgroundColor: confirmDisabled
                    ? colors.primary.muted
                    : colors.primary.default,
                },
              }}
              onPress={onConfirm}
            />
            {footerHelpText && (
              <Text style={styles.footerHelpText}>{footerHelpText}</Text>
            )}
          </View>
        </View>
      </View>
    </ElevatedView>
  );
};

export default ModalMandatory;
