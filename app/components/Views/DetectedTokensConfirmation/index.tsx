import React, { useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';

const createStyles = (colors: any) =>
  StyleSheet.create({
    fill: {
      flex: 1,
    },
    screen: { justifyContent: 'center' },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      marginHorizontal: 16,
    },
    bodyContainer: {
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    headerLabel: {
      textAlign: 'center',
      ...(fontStyles.bold as any),
      fontSize: 24,
      marginBottom: 16,
      color: colors.text.default,
    },
    description: {
      textAlign: 'center',
      fontSize: 16,
      ...(fontStyles.normal as any),
      color: colors.text.default,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
    },
    buttonsContainer: {
      flexDirection: 'row',
      padding: 16,
    },
    buttonDivider: {
      width: 8,
    },
  });

interface Props {
  route: {
    params: {
      isHidingAll?: boolean;
      onConfirm: () => void;
    };
  };
}

const DetectedTokensConfirmation = ({ route }: Props) => {
  const { onConfirm, isHidingAll } = route.params;
  const modalRef = useRef<ReusableModalRef>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const triggerCancel = () => modalRef.current?.dismissModal();

  const triggerConfirm = () => {
    modalRef.current?.dismissModal(onConfirm);
  };

  const renderHeader = () => (
    <Text style={styles.headerLabel}>
      {strings(
        `detected_tokens.confirm.${
          isHidingAll ? 'hide.title' : 'import.title'
        }`,
      )}
    </Text>
  );

  const renderDescription = () => (
    <Text style={styles.description}>
      {strings(
        `detected_tokens.confirm.${isHidingAll ? 'hide.desc' : 'import.desc'}`,
      )}
    </Text>
  );

  const renderButtons = () => (
    <View style={styles.buttonsContainer}>
      <StyledButton
        onPress={triggerCancel}
        containerStyle={styles.fill}
        type={'normal'}
      >
        {strings('detected_tokens.confirm.cancel_cta')}
      </StyledButton>
      <View style={styles.buttonDivider} />
      <StyledButton
        onPress={triggerConfirm}
        containerStyle={styles.fill}
        type={'confirm'}
      >
        {strings('detected_tokens.confirm.confirm_cta')}
      </StyledButton>
    </View>
  );

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={styles.modal}>
        <View style={styles.bodyContainer}>
          {renderHeader()}
          {renderDescription()}
        </View>
        <View style={styles.divider} />
        {renderButtons()}
      </View>
    </ReusableModal>
  );
};

export default DetectedTokensConfirmation;
