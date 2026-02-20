import React, { useRef, useCallback, useEffect } from 'react';
import { Animated as RNAnimated, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import TextField from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { useExpandableFormAnimation } from '../../hooks/useExpandableFormAnimation';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ButtonPrimary from '../../../../../component-library/components/Buttons/Button/variants/ButtonPrimary';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar';
import Tag from '../../../../../component-library/components/Tags/Tag/Tag';
import { CellComponentSelectorsIDs } from '../../../../../component-library/components/Cells/Cell/CellComponent.testIds';
import { RpcEndpointType } from '@metamask/network-controller';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import RpcUrlInput from './RpcUrlInput';
import SelectField from './SelectField';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';
import { formatNetworkRpcUrl } from '../NetworkDetailsView.utils';
import type { RpcEndpoint } from '../NetworkDetailsView.types';
import type { UseNetworkFormReturn } from '../hooks/useNetworkForm';
import type { UseNetworkValidationReturn } from '../hooks/useNetworkValidation';
import type { NetworkDetailsStyles } from '../NetworkDetailsView.styles';

const FORM_INNER_STYLE = { position: 'absolute' as const, left: 0, right: 0 };

interface RpcEndpointSectionProps {
  formHook: UseNetworkFormReturn;
  validation: UseNetworkValidationReturn;
  onValidationSuccess: () => void;
  isRpcFailoverEnabled: boolean;
  styles: NetworkDetailsStyles;
  themeAppearance: 'light' | 'dark' | 'default';
  placeholderTextColor: string;
}

const RpcEndpointSection: React.FC<RpcEndpointSectionProps> = ({
  formHook,
  validation,
  onValidationSuccess,
  isRpcFailoverEnabled,
  styles,
  themeAppearance,
  placeholderTextColor,
}) => {
  const {
    form: {
      rpcUrl,
      rpcName,
      rpcUrlForm,
      rpcNameForm,
      failoverRpcUrls,
      addMode,
    },
    inputRpcURL,
    inputNameRpcURL,
    openRpcModal,
    onRpcUrlAdd,
    onRpcNameAdd,
    onRpcUrlFocused,
    jumpToChainId,
    focus: { isRpcUrlFieldFocused },
  } = formHook;

  const {
    warningRpcUrl,
    checkIfNetworkExists,
    checkIfRpcUrlExists,
    onRpcUrlValidationChange,
  } = validation;

  if (addMode) {
    return (
      <>
        <Box twClassName="gap-1">
          <Label>{strings('app_settings.network_rpc_url_label')}</Label>
          <RpcUrlInput
            ref={inputRpcURL}
            style={[
              styles.input,
              warningRpcUrl
                ? isRpcUrlFieldFocused
                  ? styles.inputWithFocus
                  : styles.inputWithError
                : undefined,
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            value={rpcUrlForm}
            editable
            onChangeText={onRpcUrlAdd}
            onFocus={onRpcUrlFocused}
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
  }

  const displayName = rpcName || (rpcUrl ? formatNetworkRpcUrl(rpcUrl) : '');
  const secondaryText =
    rpcName && rpcUrl ? formatNetworkRpcUrl(rpcUrl) : undefined;

  const failoverTag =
    isRpcFailoverEnabled && failoverRpcUrls && failoverRpcUrls.length > 0;

  return (
    <>
      {/* RPC URL Label + Dropdown */}
      <Box>
        <Label>{strings('app_settings.network_rpc_url_label')}</Label>
        <SelectField
          value={displayName}
          secondaryText={secondaryText}
          onPress={openRpcModal}
          testID={NetworkDetailsViewSelectorsIDs.ICON_BUTTON_RPC}
          endContent={
            failoverTag ? (
              <Box twClassName="flex-row items-center gap-2">
                <Tag label={strings('app_settings.failover')} />
              </Box>
            ) : undefined
          }
        />

        {/* RPC URL Warning */}
        {warningRpcUrl && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
            testID={NetworkDetailsViewSelectorsIDs.RPC_WARNING_BANNER}
          >
            {warningRpcUrl}
          </Text>
        )}
      </Box>

      {/* Failover RPC URLs (read-only) */}
      {isRpcFailoverEnabled &&
        failoverRpcUrls &&
        failoverRpcUrls.length > 0 && (
          <Box>
            <Label>
              {strings('app_settings.network_failover_rpc_url_label')}
            </Label>
            <TextField value={failoverRpcUrls[0]} isDisabled />
          </Box>
        )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Single list item — extracted so Cell callbacks are stable per-item
// ---------------------------------------------------------------------------

interface RpcListItemProps {
  endpoint: RpcEndpoint;
  isSelected: boolean;
  isRpcFailoverEnabled: boolean;
  onSelect: (
    url: string,
    failoverUrls: string[] | undefined,
    name: string,
    type: string,
  ) => void;
  onDelete: (url: string) => void;
  onDismiss: () => void;
  styles: NetworkDetailsStyles;
}

const RpcListItem: React.FC<RpcListItemProps> = React.memo(
  ({
    endpoint,
    isSelected,
    isRpcFailoverEnabled,
    onSelect,
    onDelete,
    onDismiss,
    styles,
  }) => {
    const { url, failoverUrls, name, type } = endpoint;
    const formattedName = type === 'infura' ? 'Infura' : name;

    const handleSelect = useCallback(() => {
      onSelect(url, failoverUrls, name ?? '', type);
      onDismiss();
    }, [onSelect, onDismiss, url, failoverUrls, name, type]);

    const handleDelete = useCallback(() => onDelete(url), [onDelete, url]);

    return (
      <Cell
        variant={CellVariant.SelectWithMenu}
        title={
          <View style={styles.rpcTitleWrapper}>
            <View>
              <Text
                numberOfLines={1}
                variant={TextVariant.BodyMd}
                testID={CellComponentSelectorsIDs.BASE_TITLE}
              >
                {formattedName || formatNetworkRpcUrl(url)}
              </Text>
            </View>
            {isRpcFailoverEnabled &&
              failoverUrls &&
              failoverUrls.length > 0 && (
                <Tag label={strings('app_settings.failover')} />
              )}
          </View>
        }
        secondaryText={formattedName ? formatNetworkRpcUrl(url) : ''}
        showSecondaryTextIcon={false}
        isSelected={isSelected}
        withAvatar={false}
        onPress={handleSelect}
        showButtonIcon={!isSelected && type !== RpcEndpointType.Infura}
        buttonIcon={IconName.Trash}
        buttonProps={{ onButtonClick: handleDelete }}
        onTextClick={handleSelect}
        avatarProps={{ variant: AvatarVariant.Token }}
      />
    );
  },
);

/**
 * Single modal for RPC endpoint management. Uses the BottomSheet component
 * (replacing deprecated ReusableModal) for smooth, flicker-free animations.
 * Shows the add form directly when the list is empty, otherwise shows the list
 * with a toggle to the form. Rendered outside scroll containers for proper overlay.
 */
const RpcEndpointModals: React.FC<RpcEndpointSectionProps> = ({
  formHook,
  validation,
  onValidationSuccess,
  isRpcFailoverEnabled,
  styles,
  themeAppearance,
  placeholderTextColor,
}) => {
  const {
    form: { rpcUrl, rpcUrls, rpcUrlForm, rpcNameForm },
    inputRpcURL,
    inputNameRpcURL,
    closeRpcModal,
    onRpcUrlAdd,
    onRpcNameAdd,
    onRpcItemAdd,
    onRpcUrlChangeWithName,
    onRpcUrlDelete,
    onRpcUrlFocused,
    jumpToChainId,
    modals: { showMultiRpcAddModal, rpcModalShowForm: showForm },
    setRpcModalShowForm: setShowForm,
    focus: { isRpcUrlFieldFocused },
  } = formHook;

  const {
    warningRpcUrl,
    checkIfNetworkExists,
    checkIfRpcUrlExists,
    onRpcUrlValidationChange,
  } = validation;

  const sheetRef = useRef<BottomSheetRef>(null);
  const hadListWhenFormOpened = useRef(false);

  const { onContentLayout, contentWrapperStyle, toggleButtonStyle } =
    useExpandableFormAnimation(showForm);

  useEffect(() => {
    if (showForm) {
      hadListWhenFormOpened.current = rpcUrls.length > 0;
    }
    // rpcUrls.length intentionally excluded — only snapshot on form open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleBack = () => {
    if (showForm && rpcUrls.length > 0) {
      setShowForm(false);
    } else {
      handleDismiss();
    }
  };

  const handleFormSubmit = () => {
    onRpcItemAdd(rpcUrlForm, rpcNameForm);
    if (hadListWhenFormOpened.current) {
      setShowForm(false);
    } else {
      handleDismiss();
    }
  };

  const handleShowForm = () => setShowForm(true);

  if (!showMultiRpcAddModal) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={closeRpcModal}
      shouldNavigateBack={false}
    >
      <BottomSheetHeader onBack={handleBack}>
        {strings('app_settings.add_rpc_url')}
      </BottomSheetHeader>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContainer}
      >
        {/* RPC list — always visible when items exist */}
        {rpcUrls.length > 0 && (
          <Box twClassName="mx-4 rounded-xl overflow-hidden border border-border-muted">
            {rpcUrls.map((endpoint, index) => (
              <React.Fragment key={`${endpoint.url}-${endpoint.name}`}>
                {index > 0 && <Box twClassName="h-px bg-border-muted" />}
                <RpcListItem
                  endpoint={endpoint}
                  isSelected={rpcUrl === endpoint.url}
                  isRpcFailoverEnabled={isRpcFailoverEnabled}
                  onSelect={onRpcUrlChangeWithName}
                  onDelete={onRpcUrlDelete}
                  onDismiss={handleDismiss}
                  styles={styles}
                />
              </React.Fragment>
            ))}
          </Box>
        )}

        {/* Form — always mounted, height-animated to drive sheet resize */}
        <RNAnimated.View style={contentWrapperStyle}>
          <View
            style={FORM_INNER_STYLE}
            onLayout={onContentLayout}
            pointerEvents={showForm ? 'auto' : 'none'}
          >
            <Box twClassName="mx-4 mt-4 p-4 gap-4 rounded-xl bg-background-muted">
              <Box twClassName="gap-1">
                <Label>{strings('app_settings.network_rpc_url_label')}</Label>
                <RpcUrlInput
                  ref={inputRpcURL}
                  style={[
                    styles.input,
                    warningRpcUrl
                      ? isRpcUrlFieldFocused
                        ? styles.inputWithFocus
                        : styles.inputWithError
                      : undefined,
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={rpcUrlForm}
                  editable
                  onChangeText={onRpcUrlAdd}
                  onFocus={onRpcUrlFocused}
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
              <ButtonPrimary
                label={strings('app_settings.add_rpc_url')}
                size={ButtonSize.Lg}
                onPress={handleFormSubmit}
                width={ButtonWidthTypes.Full}
                isDisabled={!!warningRpcUrl}
                testID={NetworkDetailsViewSelectorsIDs.ADD_RPC_BUTTON}
              />
            </Box>
          </View>
        </RNAnimated.View>

        {/* Add button — crossfades out as form grows */}
        <RNAnimated.View
          style={toggleButtonStyle}
          pointerEvents={showForm ? 'none' : 'auto'}
        >
          <Box twClassName="self-center pt-4">
            <Button
              variant={ButtonVariants.Secondary}
              label={strings('app_settings.add_rpc_url')}
              startIconName={IconName.Add}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              onPress={handleShowForm}
              testID={NetworkDetailsViewSelectorsIDs.ADD_RPC_BUTTON}
            />
          </Box>
        </RNAnimated.View>
      </ScrollView>
    </BottomSheet>
  );
};

export { RpcEndpointModals };
export default RpcEndpointSection;
