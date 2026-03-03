import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconSize,
  IconName,
  IconColor,
} from '@metamask/design-system-react-native';
import TextField from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';
import { strings } from '../../../../../../locales/i18n';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';
import { CHAIN_LIST_URL } from '../NetworkDetailsView.constants';
import type { UseNetworkFormReturn } from '../hooks/useNetworkForm';
import type { UseNetworkValidationReturn } from '../hooks/useNetworkValidation';

const openChainList = () => Linking.openURL(CHAIN_LIST_URL);

// ---------------------------------------------------------------------------
// Sub-components for warnings
// ---------------------------------------------------------------------------

const ChainIdWarning: React.FC<{
  warningChainId: string;
  goToNetworkEdit: () => void;
}> = ({ warningChainId, goToNetworkEdit }) => {
  if (warningChainId === strings('app_settings.unMatched_chain_name')) {
    return (
      <Box twClassName="gap-1">
        <Text variant={TextVariant.BodySm} twClassName="text-error-default">
          {warningChainId}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-error-default">
          {strings('app_settings.find_the_right_one')}{' '}
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-info-default"
            onPress={openChainList}
          >
            chainid.network{' '}
            <Icon
              size={IconSize.Xs}
              name={IconName.Export}
              color={IconColor.PrimaryAlternative}
            />
          </Text>
        </Text>
      </Box>
    );
  }

  if (
    warningChainId ===
    strings('app_settings.chain_id_associated_with_another_network')
  ) {
    return (
      <Text variant={TextVariant.BodySm} twClassName="text-error-default">
        {strings('app_settings.chain_id_associated_with_another_network')}{' '}
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-info-default"
          onPress={goToNetworkEdit}
        >
          {strings('app_settings.edit_original_network')}
        </Text>
      </Text>
    );
  }

  return (
    <Text variant={TextVariant.BodySm} twClassName="text-error-default">
      {warningChainId}
    </Text>
  );
};

const SymbolWarning: React.FC<{
  warningSymbol: string;
  validatedSymbol: boolean;
  autoFillSymbolField: (ticker: string) => void;
}> = ({ warningSymbol, validatedSymbol, autoFillSymbolField }) => (
  <Box>
    <Text variant={TextVariant.BodySm} twClassName="text-warning-default">
      {strings('wallet.suggested_token_symbol')}{' '}
      <Text
        variant={TextVariant.BodySm}
        twClassName="text-info-default"
        onPress={() => autoFillSymbolField(warningSymbol)}
      >
        {warningSymbol}
      </Text>
    </Text>
    {validatedSymbol && (
      <Text variant={TextVariant.BodySm} twClassName="text-text-alternative">
        {strings('wallet.chain_list_returned_different_ticker_symbol')}
      </Text>
    )}
  </Box>
);

// ---------------------------------------------------------------------------
// Network Name field (rendered above RPC URL)
// ---------------------------------------------------------------------------

interface NetworkNameFieldProps {
  formHook: UseNetworkFormReturn;
  validation: UseNetworkValidationReturn;
  onValidateName: () => void;
  themeAppearance: 'light' | 'dark' | 'default';
  placeholderTextColor: string;
}

const NetworkNameField: React.FC<NetworkNameFieldProps> = ({
  formHook,
  validation,
  onValidateName,
  themeAppearance,
  placeholderTextColor,
}) => {
  const {
    form: { nickname },
    isAnyModalVisible,
    onNicknameChange,
    autoFillNameField,
    onNameFocused,
    onNameBlur,
    jumpToRpcURL,
  } = formHook;

  const { warningName } = validation;

  const handleNameBlur = useCallback(() => {
    onValidateName();
    onNameBlur();
  }, [onValidateName, onNameBlur]);

  return (
    <Box twClassName="gap-1">
      <Label>{strings('app_settings.network_name_label')}</Label>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        value={nickname}
        isDisabled={isAnyModalVisible}
        onChangeText={onNicknameChange}
        placeholder={strings('app_settings.network_name_placeholder')}
        placeholderTextColor={placeholderTextColor}
        onBlur={handleNameBlur}
        onFocus={onNameFocused}
        onSubmitEditing={jumpToRpcURL}
        testID={NetworkDetailsViewSelectorsIDs.NETWORK_NAME_INPUT}
        keyboardAppearance={themeAppearance}
        isError={!!warningName}
      />
      {warningName ? (
        <Box>
          <Text variant={TextVariant.BodySm} twClassName="text-warning-default">
            {strings('wallet.incorrect_network_name_warning')}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-warning-default">
            {strings('wallet.suggested_name')}{' '}
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-info-default"
              onPress={() => autoFillNameField(warningName)}
            >
              {warningName}
            </Text>
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Chain ID + Symbol fields (rendered below RPC URL)
// ---------------------------------------------------------------------------

interface NetworkChainSymbolFieldsProps {
  formHook: UseNetworkFormReturn;
  validation: UseNetworkValidationReturn;
  onValidateChainId: () => void;
  onValidateSymbol: () => void;
  goToNetworkEdit: () => void;
  themeAppearance: 'light' | 'dark' | 'default';
  placeholderTextColor: string;
}

const NetworkChainSymbolFields: React.FC<NetworkChainSymbolFieldsProps> = ({
  formHook,
  validation,
  onValidateChainId,
  onValidateSymbol,
  goToNetworkEdit,
  themeAppearance,
  placeholderTextColor,
}) => {
  const {
    form: { chainId, ticker, addMode },
    isAnyModalVisible,
    onChainIDChange,
    onTickerChange,
    autoFillSymbolField,
    onChainIdFocused,
    onChainIdBlur,
    onSymbolFocused,
    onSymbolBlur,
    jumpToSymbol,
    jumpBlockExplorerURL,
    inputChainId,
    inputSymbol,
  } = formHook;

  const { warningChainId, warningSymbol, validatedSymbol } = validation;

  const handleChainIdBlur = useCallback(() => {
    onValidateChainId();
    onChainIdBlur();
  }, [onValidateChainId, onChainIdBlur]);

  const handleSymbolBlur = useCallback(() => {
    onValidateSymbol();
    onSymbolBlur();
  }, [onValidateSymbol, onSymbolBlur]);

  return (
    <>
      {/* Chain ID */}
      <Box twClassName="gap-1">
        <Label>{strings('app_settings.network_chain_id_label')}</Label>
        <TextField
          ref={inputChainId}
          autoCapitalize="none"
          autoCorrect={false}
          value={chainId}
          isDisabled={isAnyModalVisible || !addMode}
          onChangeText={onChainIDChange}
          onBlur={handleChainIdBlur}
          onFocus={onChainIdFocused}
          placeholder={strings('app_settings.network_chain_id_placeholder')}
          placeholderTextColor={placeholderTextColor}
          onSubmitEditing={jumpToSymbol}
          keyboardType="numbers-and-punctuation"
          testID={NetworkDetailsViewSelectorsIDs.CHAIN_INPUT}
          keyboardAppearance={themeAppearance}
          isError={!!warningChainId}
        />
        {warningChainId ? (
          <ChainIdWarning
            warningChainId={warningChainId}
            goToNetworkEdit={goToNetworkEdit}
          />
        ) : null}
      </Box>

      {/* Symbol */}
      <Box twClassName="gap-1">
        <Label>{strings('app_settings.network_symbol_label')}</Label>
        <TextField
          ref={inputSymbol}
          autoCapitalize="none"
          autoCorrect={false}
          value={ticker}
          isDisabled={isAnyModalVisible}
          onChangeText={onTickerChange}
          onBlur={handleSymbolBlur}
          onFocus={onSymbolFocused}
          placeholder={strings('app_settings.network_symbol_label')}
          placeholderTextColor={placeholderTextColor}
          onSubmitEditing={jumpBlockExplorerURL}
          testID={NetworkDetailsViewSelectorsIDs.NETWORKS_SYMBOL_INPUT}
          keyboardAppearance={themeAppearance}
          isError={!!warningSymbol}
        />
        {warningSymbol ? (
          <SymbolWarning
            warningSymbol={warningSymbol}
            validatedSymbol={validatedSymbol}
            autoFillSymbolField={autoFillSymbolField}
          />
        ) : null}
      </Box>
    </>
  );
};

export { NetworkNameField, NetworkChainSymbolFields };
export default NetworkChainSymbolFields;
