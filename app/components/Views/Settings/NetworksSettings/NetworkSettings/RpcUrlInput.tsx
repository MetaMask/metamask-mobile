import React, { useState, useCallback, RefObject } from 'react';
import { View, TextInput, TextInputProps, TextStyle } from 'react-native';
import URLParse from 'url-parse';
import { isWebUri } from 'valid-url';
import { strings } from '../../../../../../locales/i18n';
import { isPrivateConnection } from '../../../../../util/networks';
import Text from '../../../../../component-library/components/Texts/Text';
import { NetworksViewSelectorsIDs } from '../NetworksView.testIds';

type InputProps = Pick<
  TextInputProps,
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'editable'
  | 'keyboardAppearance'
  | 'onBlur'
  | 'onFocus'
  | 'onChangeText'
  | 'onSubmitEditing'
  | 'placeholder'
  | 'placeholderTextColor'
  | 'style'
  | 'testID'
  | 'value'
> & {
  ref?: RefObject<TextInput>;
};

interface RpcUrlInputProps extends InputProps {
  checkIfNetworkExists: (rpcUrl: string) => Promise<unknown[]>;
  checkIfRpcUrlExists: (rpcUrl: string) => Promise<unknown[]>;
  onValidationSuccess?: () => void;
  onValidationChange: (isValid: boolean) => void;
  warningStyle?: TextStyle;
}

const RpcUrlInput: React.FC<RpcUrlInputProps> = (props) => {
  const {
    checkIfNetworkExists,
    checkIfRpcUrlExists,
    onValidationSuccess,
    onValidationChange,
    warningStyle,
    ...inputProps
  } = props;
  const { onChangeText } = inputProps ?? {};

  const [warningRpcUrl, setWarningRpcUrl] = useState<string | undefined>(
    undefined,
  );

  const validateRpcUrl = useCallback(
    async (rpcUrl: string) => {
      const isNetworkExists = await checkIfNetworkExists(rpcUrl);
      const isRpcExists = await checkIfRpcUrlExists(rpcUrl);
      if (!isWebUri(rpcUrl)) {
        const appendedRpc = `http://${rpcUrl}`;
        if (isWebUri(appendedRpc)) {
          setWarningRpcUrl(strings('app_settings.invalid_rpc_prefix'));
        } else {
          setWarningRpcUrl(strings('app_settings.invalid_rpc_url'));
        }
        onValidationChange(false);
        return false;
      }
      if (isRpcExists.length > 0) {
        setWarningRpcUrl(strings('app_settings.invalid_rpc_url'));
        onValidationChange(false);
        return;
      }

      if (isNetworkExists.length > 0) {
        setWarningRpcUrl(
          strings('app_settings.url_associated_to_another_chain_id'),
        );
        onValidationChange(false);
        return;
      }

      const url = new URLParse(rpcUrl);
      const privateConnection = isPrivateConnection(url.hostname);
      if (!privateConnection && url.protocol === 'http:') {
        setWarningRpcUrl(strings('app_settings.invalid_rpc_prefix'));
        onValidationChange(false);
        return false;
      }
      setWarningRpcUrl(undefined);
      if (onValidationSuccess) {
        onValidationSuccess();
      }
      onValidationChange(true);
      return true;
    },
    [
      checkIfNetworkExists,
      checkIfRpcUrlExists,
      onValidationChange,
      onValidationSuccess,
    ],
  );

  const handleRpcUrlChange = useCallback(
    (url: string) => {
      onChangeText?.(url);
      validateRpcUrl(url);
    },
    [onChangeText, validateRpcUrl],
  );

  return (
    <>
      <TextInput {...inputProps} onChangeText={handleRpcUrlChange} />
      {warningRpcUrl && (
        <View testID={NetworksViewSelectorsIDs.RPC_WARNING_BANNER}>
          <Text style={warningStyle}>{warningRpcUrl}</Text>
        </View>
      )}
    </>
  );
};

export default RpcUrlInput;
