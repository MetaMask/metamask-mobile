import React from 'react';
import { Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { InstallSnapApprovalArgs } from './types';
import createStyles from './styles';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import {
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
  CANCEL_BUTTON_ID,
} from '../../../constants/test-ids';

const InstallSnapApproval = ({
  requestData,
  onConfirm,
  onCancel,
}: InstallSnapApprovalArgs) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const confirm = (): void => {
    // eslint-disable-next-line no-console
    console.log('confirm', onConfirm);
    onConfirm();
    // Add track event
  };

  const cancel = (): void => {
    // Add track event
    onCancel();
  };

  return (
    <View style={styles.root} testID={ACCOUNT_APROVAL_MODAL_CONTAINER_ID}>
      {/* <Text>SNAP ID: {`${requestData.data.snapId}`}</Text> */}
      <Text>{`${selectedAddress} ${JSON.stringify(requestData)}`}</Text>
      <View style={styles.actionContainer}>
        <StyledButton
          type={'cancel'}
          onPress={cancel}
          containerStyle={[styles.button, styles.cancel]}
          testID={CANCEL_BUTTON_ID}
        >
          {strings('accountApproval.cancel')}
        </StyledButton>
        <StyledButton
          type={'confirm'}
          onPress={confirm}
          containerStyle={[styles.button, styles.confirm]}
          testID={'connect-approve-button'}
        >
          Approve
        </StyledButton>
      </View>
    </View>
  );
};

export default InstallSnapApproval;
