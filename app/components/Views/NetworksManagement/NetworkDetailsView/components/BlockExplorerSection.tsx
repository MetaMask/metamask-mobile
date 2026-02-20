import React, { useRef, useCallback, useEffect } from 'react';
import { Animated as RNAnimated, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import isUrl from 'is-url';
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
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import SelectField from './SelectField';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';
import type { UseNetworkFormReturn } from '../hooks/useNetworkForm';
import type { NetworkDetailsStyles } from '../NetworkDetailsView.styles';

const FORM_INNER_STYLE = { position: 'absolute' as const, left: 0, right: 0 };

interface BlockExplorerSectionProps {
  formHook: UseNetworkFormReturn;
  styles: NetworkDetailsStyles;
  themeAppearance: 'light' | 'dark' | 'default';
  placeholderTextColor: string;
}

const BlockExplorerSection: React.FC<BlockExplorerSectionProps> = ({
  formHook,
  themeAppearance,
  placeholderTextColor,
}) => {
  const {
    form: { blockExplorerUrl, blockExplorerUrlForm, addMode },
    openBlockExplorerModal,
    onBlockExplorerUrlChange,
    inputBlockExplorerURL,
  } = formHook;

  if (addMode) {
    return (
      <Box twClassName="gap-1">
        <Label>{strings('app_settings.network_block_explorer_label')}</Label>
        <TextField
          ref={inputBlockExplorerURL}
          autoCapitalize="none"
          value={blockExplorerUrlForm}
          autoCorrect={false}
          onChangeText={onBlockExplorerUrlChange}
          placeholder={strings(
            'app_settings.network_block_explorer_placeholder',
          )}
          testID={NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_INPUT}
          placeholderTextColor={placeholderTextColor}
          keyboardAppearance={themeAppearance}
        />
      </Box>
    );
  }

  return (
    <>
      <Box>
        <Label>{strings('app_settings.network_block_explorer_label')}</Label>
        <SelectField
          value={blockExplorerUrl}
          onPress={openBlockExplorerModal}
          testID={NetworkDetailsViewSelectorsIDs.ICON_BUTTON_BLOCK_EXPLORER}
        />
      </Box>
    </>
  );
};

// ---------------------------------------------------------------------------
// Single list item — extracted so Cell callbacks are stable per-item
// ---------------------------------------------------------------------------

interface BlockExplorerListItemProps {
  url: string;
  isSelected: boolean;
  onSelect: (url: string) => void;
  onDelete: (url: string) => void;
}

const BlockExplorerListItem: React.FC<BlockExplorerListItemProps> = React.memo(
  ({ url, isSelected, onSelect, onDelete }) => {
    const handlePress = useCallback(() => onSelect(url), [onSelect, url]);
    const handleDelete = useCallback(() => onDelete(url), [onDelete, url]);

    return (
      <Cell
        variant={CellVariant.SelectWithMenu}
        title={url}
        isSelected={isSelected}
        withAvatar={false}
        onPress={handlePress}
        showButtonIcon={!isSelected}
        buttonIcon={IconName.Trash}
        buttonProps={{ onButtonClick: handleDelete }}
        avatarProps={{ variant: AvatarVariant.Network }}
      />
    );
  },
);

/**
 * Single modal for block explorer management. Uses the BottomSheet component
 * (replacing deprecated ReusableModal) for smooth, flicker-free animations.
 * Shows the add form directly when the list is empty, otherwise shows the list
 * with a toggle to the form. Rendered outside scroll containers for proper overlay.
 */
const BlockExplorerModals: React.FC<BlockExplorerSectionProps> = ({
  formHook,
  styles,
  themeAppearance,
  placeholderTextColor,
}) => {
  const {
    form: { blockExplorerUrl, blockExplorerUrls, blockExplorerUrlForm },
    closeBlockExplorerModal,
    onBlockExplorerItemAdd,
    onBlockExplorerUrlChange,
    onBlockExplorerUrlDelete,
    inputBlockExplorerURL,
    modals: {
      showMultiBlockExplorerAddModal,
      blockExplorerModalShowForm: showForm,
    },
    setBlockExplorerModalShowForm: setShowForm,
  } = formHook;

  const sheetRef = useRef<BottomSheetRef>(null);
  const hadListWhenFormOpened = useRef(false);

  const { onContentLayout, contentWrapperStyle, toggleButtonStyle } =
    useExpandableFormAnimation(showForm);

  useEffect(() => {
    if (showForm) {
      hadListWhenFormOpened.current = blockExplorerUrls.length > 0;
    }
    // blockExplorerUrls.length intentionally excluded — only snapshot on form open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSelectAndDismiss = useCallback(
    (url: string) => {
      onBlockExplorerUrlChange(url);
      handleDismiss();
    },
    [onBlockExplorerUrlChange, handleDismiss],
  );

  const handleBack = () => {
    if (showForm && blockExplorerUrls.length > 0) {
      setShowForm(false);
    } else {
      handleDismiss();
    }
  };

  const handleFormSubmit = () => {
    if (!blockExplorerUrlForm) return;
    onBlockExplorerItemAdd(blockExplorerUrlForm);
    if (hadListWhenFormOpened.current) {
      setShowForm(false);
    } else {
      handleDismiss();
    }
  };

  const handleShowForm = () => setShowForm(true);

  if (!showMultiBlockExplorerAddModal) return null;

  const hasInvalidUrl =
    !!blockExplorerUrlForm &&
    (!isUrl(blockExplorerUrlForm) ||
      blockExplorerUrls.includes(blockExplorerUrlForm));

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={closeBlockExplorerModal}
      shouldNavigateBack={false}
    >
      <BottomSheetHeader onBack={handleBack}>
        {strings('app_settings.add_block_explorer_url')}
      </BottomSheetHeader>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContainer}
      >
        {/* Block explorer list — always visible when items exist */}
        {blockExplorerUrls.length > 0 && (
          <Box twClassName="mx-4 rounded-xl overflow-hidden border border-border-muted">
            {blockExplorerUrls.map((url, index) => (
              <React.Fragment key={url}>
                {index > 0 && <Box twClassName="h-px bg-border-muted" />}
                <BlockExplorerListItem
                  url={url}
                  isSelected={blockExplorerUrl === url}
                  onSelect={handleSelectAndDismiss}
                  onDelete={onBlockExplorerUrlDelete}
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
                <Label>
                  {strings('app_settings.network_block_explorer_label')}
                </Label>
                <TextField
                  ref={inputBlockExplorerURL}
                  autoCapitalize="none"
                  value={blockExplorerUrlForm}
                  autoCorrect={false}
                  onChangeText={onBlockExplorerUrlChange}
                  placeholder={strings(
                    'app_settings.network_block_explorer_placeholder',
                  )}
                  testID={NetworkDetailsViewSelectorsIDs.BLOCK_EXPLORER_INPUT}
                  placeholderTextColor={placeholderTextColor}
                  onSubmitEditing={handleFormSubmit}
                  keyboardAppearance={themeAppearance}
                  isError={hasInvalidUrl}
                />
                {hasInvalidUrl && (
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-error-default"
                  >
                    {strings('app_settings.invalid_block_explorer_url')}
                  </Text>
                )}
              </Box>
              <ButtonPrimary
                label={strings('app_settings.add_block_explorer_url')}
                testID={NetworkDetailsViewSelectorsIDs.ADD_BLOCK_EXPLORER}
                size={ButtonSize.Lg}
                onPress={handleFormSubmit}
                width={ButtonWidthTypes.Full}
                isDisabled={
                  !blockExplorerUrlForm || !isUrl(blockExplorerUrlForm)
                }
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
              label={strings('app_settings.add_block_explorer_url')}
              startIconName={IconName.Add}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              onPress={handleShowForm}
              testID={NetworkDetailsViewSelectorsIDs.ADD_BLOCK_EXPLORER}
            />
          </Box>
        </RNAnimated.View>
      </ScrollView>
    </BottomSheet>
  );
};

export { BlockExplorerModals };
export default BlockExplorerSection;
