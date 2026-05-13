import React from 'react';
import { TextInput } from 'react-native';
import { Box, Label } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import TextField from '../../../../../component-library/components/Form/TextField';
import RpcUrlInput from './RpcUrlInput';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';
import type { NetworkDetailsStyles } from '../NetworkDetailsView.styles';

interface RpcFormFieldsProps {
  inputRpcURL: React.RefObject<TextInput>;
  inputNameRpcURL: React.RefObject<TextInput>;
  rpcUrlForm: string;
  rpcNameForm: string;
  isRpcUrlFieldFocused: boolean;
  warningRpcUrl: string | undefined;
  onRpcUrlAdd: (url: string) => void;
  onRpcNameAdd: (name: string) => void;
  onRpcUrlFocused: () => void;
  onRpcUrlBlur: () => void;
  jumpToChainId: () => void;
  checkIfNetworkExists: (rpcUrl: string) => Promise<{ chainId: string }[]>;
  checkIfRpcUrlExists: (rpcUrl: string) => Promise<{ chainId: string }[]>;
  onValidationSuccess: () => void;
  onRpcUrlValidationChange: (isValid: boolean) => void;
  styles: NetworkDetailsStyles;
  themeAppearance: 'light' | 'dark' | 'default';
  placeholderTextColor: string;
}

const RpcFormFields: React.FC<RpcFormFieldsProps> = ({
  inputRpcURL,
  inputNameRpcURL,
  rpcUrlForm,
  rpcNameForm,
  isRpcUrlFieldFocused,
  warningRpcUrl,
  onRpcUrlAdd,
  onRpcNameAdd,
  onRpcUrlFocused,
  onRpcUrlBlur,
  jumpToChainId,
  checkIfNetworkExists,
  checkIfRpcUrlExists,
  onValidationSuccess,
  onRpcUrlValidationChange,
  styles,
  themeAppearance,
  placeholderTextColor,
}) => (
  <>
    <Box twClassName="gap-1">
      <Label>{strings('app_settings.network_rpc_url_label')}</Label>
      <RpcUrlInput
        ref={inputRpcURL}
        style={[
          styles.input,
          isRpcUrlFieldFocused
            ? styles.inputWithFocus
            : warningRpcUrl
              ? styles.inputWithError
              : undefined,
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        value={rpcUrlForm}
        editable
        onChangeText={onRpcUrlAdd}
        onFocus={onRpcUrlFocused}
        onBlur={onRpcUrlBlur}
        placeholder={strings('app_settings.network_rpc_placeholder')}
        placeholderTextColor={placeholderTextColor}
        onSubmitEditing={jumpToChainId}
        testID={NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT}
        keyboardAppearance={themeAppearance}
        checkIfNetworkExists={checkIfNetworkExists}
        checkIfRpcUrlExists={checkIfRpcUrlExists}
        onValidationSuccess={onValidationSuccess}
        onValidationChange={onRpcUrlValidationChange}
        warningStyle={styles.warningText}
      />
    </Box>
    <Box twClassName="gap-1">
      <Label>{strings('app_settings.network_rpc_name_label')}</Label>
      <TextField
        ref={inputNameRpcURL}
        autoCapitalize="none"
        value={rpcNameForm}
        autoCorrect={false}
        onChangeText={onRpcNameAdd}
        placeholder={strings('app_settings.network_rpc_placeholder')}
        placeholderTextColor={placeholderTextColor}
        onSubmitEditing={jumpToChainId}
        testID={NetworkDetailsViewSelectorsIDs.RPC_NAME_INPUT}
        keyboardAppearance={themeAppearance}
      />
    </Box>
  </>
);

export default RpcFormFields;
