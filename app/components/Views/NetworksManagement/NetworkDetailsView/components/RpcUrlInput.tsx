import React, { useState, useCallback, forwardRef } from 'react';
import { View, TextInput, TextInputProps, TextStyle } from 'react-native';
import URLParse from 'url-parse';
import { isWebUri } from 'valid-url';
import { strings } from '../../../../../../locales/i18n';
import { isPrivateConnection } from '../../../../../util/networks';
import Text from '../../../../../component-library/components/Texts/Text';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';

export interface RpcUrlInputProps extends TextInputProps {
  checkIfNetworkExists: (rpcUrl: string) => Promise<{ chainId: string }[]>;
  checkIfRpcUrlExists: (rpcUrl: string) => Promise<{ chainId: string }[]>;
  onValidationSuccess?: () => void;
  onValidationChange: (isValid: boolean) => void;
  warningStyle?: TextStyle;
}

const RpcUrlInput = forwardRef<TextInput, RpcUrlInputProps>((props, ref) => {
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
      <TextInput ref={ref} {...inputProps} onChangeText={handleRpcUrlChange} />
      {warningRpcUrl && (
        <View testID={NetworkDetailsViewSelectorsIDs.RPC_WARNING_BANNER}>
          <Text style={warningStyle}>{warningRpcUrl}</Text>
        </View>
      )}
    </>
  );
});

export default RpcUrlInput;
