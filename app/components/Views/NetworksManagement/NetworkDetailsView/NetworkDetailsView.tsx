import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ImageSourcePropType, Platform, Pressable } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';

import { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks/useStyles';
import {
  canDeleteNetwork,
  getNetworkImageSource,
} from '../../../../util/networks';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { selectIsRpcFailoverEnabled } from '../../../../selectors/featureFlagController/walletFramework';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { BottomSheetRef } from '../../../../component-library/components/BottomSheets/BottomSheet';
import InfoModal from '../../../Base/InfoModal';
import DeleteNetworkModal from '../components/DeleteNetworkModal';

import { useNetworkForm } from './hooks/useNetworkForm';
import { useNetworkValidation } from './hooks/useNetworkValidation';
import { useNetworkOperations } from './hooks/useNetworkOperations';

import {
  NetworkNameField,
  NetworkChainSymbolFields,
} from './components/NetworkFormFields';
import RpcEndpointSection, {
  RpcEndpointModals,
} from './components/RpcEndpointSection';
import BlockExplorerSection, {
  BlockExplorerModals,
} from './components/BlockExplorerSection';

import { NetworkDetailsViewSelectorsIDs } from './NetworkDetailsView.testIds';
import createStyles from './NetworkDetailsView.styles';
import type {
  NetworkDetailsViewParams,
  NetworkFormState,
  UrlSheetPersistOptions,
} from './NetworkDetailsView.types';

type NetworkDetailsRouteParams = RouteProp<
  { AddNetworkForm: NetworkDetailsViewParams },
  'AddNetworkForm'
>;

const NetworkDetailsView = () => {
  const route = useRoute<NetworkDetailsRouteParams>();
  const navigation = useNavigation();
  const params = route.params;
  const tw = useTailwind();
  const { colors, themeAppearance } = useTheme();
  const { styles } = useStyles(createStyles);

  const isRpcFailoverEnabled = useSelector(selectIsRpcFailoverEnabled);
  const { disableNetwork } = useNetworkEnablement();
  const deleteModalRef = useRef<BottomSheetRef>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isCustomMainnet = params?.isCustomMainnet ?? false;
  const shouldNetworkSwitchPopToWallet =
    params?.shouldNetworkSwitchPopToWallet ?? true;
  const trackRpcUpdateFromBanner = params?.trackRpcUpdateFromBanner ?? false;

  const formHook = useNetworkForm(params);
  const validation = useNetworkValidation();
  const operations = useNetworkOperations();

  // Wire validation callbacks into form hook
  useEffect(() => {
    formHook.setValidationCallback(() => {
      if (formHook.form.addMode) {
        validation.validateChainId(formHook.form);
      }
      validation.validateName(formHook.form);
      validation.validateSymbol(formHook.form);
    });
  }, [formHook, validation]);

  // `editable` only locks name/symbol fields — RPC & block explorer lists still change;
  // Save / sheet persist must run when those lists diverge from the last saved baseline.
  const isActionDisabled =
    !formHook.enableAction ||
    validation.disabledByChainId(formHook.form) ||
    validation.disabledByName(formHook.form) ||
    validation.disabledBySymbol(formHook.form);

  // Latest form + deps for sheet persist. Reassigned every render; async persist reads
  // `persistSheetCtxRef.current` inside `runPersist` so data is never "initial render" stale.
  const persistSheetCtxRef = useRef({
    form: formHook.form,
    enableAction: formHook.enableAction,
    validation,
    operations,
    isCustomMainnet,
    shouldNetworkSwitchPopToWallet,
    trackRpcUpdateFromBanner,
    commitBaselineFromFormState: formHook.commitBaselineFromFormState,
  });
  persistSheetCtxRef.current = {
    form: formHook.form,
    enableAction: formHook.enableAction,
    validation,
    operations,
    isCustomMainnet,
    shouldNetworkSwitchPopToWallet,
    trackRpcUpdateFromBanner,
    commitBaselineFromFormState: formHook.commitBaselineFromFormState,
  };

  const handleSave = useCallback(async () => {
    await operations.saveNetwork(formHook.form, {
      enableAction: formHook.enableAction,
      disabledByChainId: validation.disabledByChainId(formHook.form),
      disabledByName: validation.disabledByName(formHook.form),
      disabledBySymbol: validation.disabledBySymbol(formHook.form),
      isCustomMainnet,
      shouldNetworkSwitchPopToWallet,
      trackRpcUpdateFromBanner,
      validateChainIdOnSubmit: validation.validateChainIdOnSubmit,
    });
  }, [
    formHook.form,
    formHook.enableAction,
    validation,
    operations,
    isCustomMainnet,
    shouldNetworkSwitchPopToWallet,
    trackRpcUpdateFromBanner,
  ]);

  /**
   * Persist after RPC / block-explorer sheet mutations. Callers pass the committed
   * `NetworkFormState` snapshot produced by the same pure transforms as the form hook.
   *
   * Intentionally `[]` deps: the callback must stay referentially stable for sheet children,
   * and always reads fresh `form` / `operations` / `validation` via `persistSheetCtxRef.current`
   * at invoke time (ref is updated synchronously each render above).
   */
  const schedulePersistAfterUrlSheetMutation = useCallback(
    async (
      committedFormSnapshot: NetworkFormState,
      persistOptions?: UrlSheetPersistOptions,
    ): Promise<boolean> => {
      const ctx = persistSheetCtxRef.current;
      if (committedFormSnapshot.addMode) {
        return false;
      }
      try {
        const saved = await ctx.operations.saveNetwork(committedFormSnapshot, {
          enableAction: ctx.enableAction,
          disabledByChainId: ctx.validation.disabledByChainId(
            committedFormSnapshot,
          ),
          disabledByName: ctx.validation.disabledByName(committedFormSnapshot),
          disabledBySymbol: ctx.validation.disabledBySymbol(
            committedFormSnapshot,
          ),
          isCustomMainnet: ctx.isCustomMainnet,
          shouldNetworkSwitchPopToWallet: ctx.shouldNetworkSwitchPopToWallet,
          trackRpcUpdateFromBanner: ctx.trackRpcUpdateFromBanner,
          validateChainIdOnSubmit: ctx.validation.validateChainIdOnSubmit,
          skipPostSaveNavigation: true,
          bypassEnableActionGuard: true,
          bypassFormDisabledGuards: true,
          skipChainIdSubmitValidation:
            persistOptions?.skipChainIdSubmitValidation === true,
        });
        if (saved === true) {
          ctx.commitBaselineFromFormState(committedFormSnapshot);
        }
        return saved === true;
      } catch {
        return false;
      }
    },
    [],
  );

  const handleValidateChainId = useCallback(() => {
    validation.validateChainId(formHook.form);
  }, [validation, formHook.form]);

  const handleValidateName = useCallback(() => {
    validation.validateName(formHook.form);
  }, [validation, formHook.form]);

  const handleValidateSymbol = useCallback(() => {
    validation.validateSymbol(formHook.form);
  }, [validation, formHook.form]);

  const handleValidateRpcAndChainId = useCallback(() => {
    validation.validateRpcAndChainId(formHook.form);
  }, [validation, formHook.form]);

  const handleGoToNetworkEdit = useCallback(() => {
    if (formHook.form.rpcUrl) {
      operations.goToNetworkEdit(formHook.form.rpcUrl);
    }
  }, [formHook.form.rpcUrl, operations]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    const { chainId } = formHook.form;
    if (!chainId) return;
    await operations.removeNetwork(chainId);
    const caipChainId: CaipChainId = `eip155:${parseInt(chainId, 16)}`;
    disableNetwork(caipChainId);
    setShowDeleteModal(false);
  }, [formHook.form, disableNetwork, operations]);

  const headerTitle = formHook.form.addMode
    ? strings('app_settings.add_network_title')
    : formHook.form.nickname || strings('app_settings.network_name_label');

  const networkImageSource = useMemo(() => {
    if (!formHook.form.chainId) return undefined;
    return getNetworkImageSource({
      chainId: formHook.form.chainId,
    }) as ImageSourcePropType | undefined;
  }, [formHook.form.chainId]);

  const placeholderTextColor = colors.text.muted;

  const content = (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'bottom']}
      testID={NetworkDetailsViewSelectorsIDs.CONTAINER}
    >
      <HeaderCompactStandard
        onBack={handleBack}
        endAccessory={
          !formHook.form.addMode &&
          canDeleteNetwork(formHook.form.chainId ?? '') ? (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) =>
                tw.style(
                  'w-9 h-9 mr-2 items-center justify-center',
                  pressed && 'opacity-70',
                )
              }
            >
              <Icon
                name={IconName.Trash}
                size={IconSize.Md}
                color={IconColor.Default}
              />
            </Pressable>
          ) : undefined
        }
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          {!formHook.form.addMode && (
            <AvatarNetwork
              size={AvatarSize.Xs}
              name={formHook.form.nickname}
              imageSource={networkImageSource}
            />
          )}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
        </Box>
      </HeaderCompactStandard>
      <KeyboardAwareScrollView
        contentContainerStyle={tw.style('flex-grow px-4')}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={Platform.OS === 'android' ? 120 : 20}
        disableScrollOnKeyboardHide
      >
        <Box twClassName="flex-1 gap-4 pt-4 mb-6">
          {/* Network Name */}
          <NetworkNameField
            formHook={formHook}
            validation={validation}
            onValidateName={handleValidateName}
            themeAppearance={themeAppearance}
            placeholderTextColor={placeholderTextColor}
          />

          {/* RPC URL — inline form in add mode, selector in edit mode */}
          <RpcEndpointSection
            formHook={formHook}
            validation={validation}
            onValidationSuccess={handleValidateRpcAndChainId}
            isRpcFailoverEnabled={!!isRpcFailoverEnabled}
            styles={styles}
            themeAppearance={themeAppearance}
            placeholderTextColor={placeholderTextColor}
          />

          {/* Chain ID + Symbol */}
          <NetworkChainSymbolFields
            formHook={formHook}
            validation={validation}
            onValidateChainId={handleValidateChainId}
            onValidateSymbol={handleValidateSymbol}
            goToNetworkEdit={handleGoToNetworkEdit}
            themeAppearance={themeAppearance}
            placeholderTextColor={placeholderTextColor}
          />

          {/* Block Explorer — inline form in add mode, selector in edit mode */}
          <BlockExplorerSection
            formHook={formHook}
            styles={styles}
            themeAppearance={themeAppearance}
            placeholderTextColor={placeholderTextColor}
          />
        </Box>
      </KeyboardAwareScrollView>

      {/* Save / Add button — sticky footer */}
      <Box twClassName="px-4 pt-2 pb-4">
        <Button
          variant={ButtonVariants.Primary}
          onPress={handleSave}
          label={
            isCustomMainnet
              ? strings('app_settings.networks_default_cta')
              : strings('app_settings.network_save')
          }
          size={ButtonSize.Lg}
          isDisabled={isActionDisabled}
          width={ButtonWidthTypes.Full}
          testID={
            isCustomMainnet
              ? NetworkDetailsViewSelectorsIDs.USE_THIS_NETWORK_BUTTON
              : NetworkDetailsViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON
          }
        />
      </Box>

      {/* RPC & Block Explorer modals — only in edit mode */}
      {!formHook.form.addMode && (
        <>
          <RpcEndpointModals
            formHook={formHook}
            validation={validation}
            onValidationSuccess={handleValidateRpcAndChainId}
            isRpcFailoverEnabled={!!isRpcFailoverEnabled}
            styles={styles}
            themeAppearance={themeAppearance}
            placeholderTextColor={placeholderTextColor}
            onUrlSheetMutationCommitted={schedulePersistAfterUrlSheetMutation}
          />
          <BlockExplorerModals
            formHook={formHook}
            styles={styles}
            themeAppearance={themeAppearance}
            placeholderTextColor={placeholderTextColor}
            onUrlSheetMutationCommitted={schedulePersistAfterUrlSheetMutation}
          />
        </>
      )}

      {/* Warning modal */}
      {formHook.modals.showWarningModal ? (
        <InfoModal
          isVisible={formHook.modals.showWarningModal}
          title={strings('networks.network_warning_title')}
          body={
            <Text variant={TextVariant.BodyMd}>
              <Text variant={TextVariant.BodyMd}>
                {strings('networks.network_warning_desc')}
              </Text>{' '}
              <Text
                variant={TextVariant.BodyMd}
                twClassName="text-info-default"
              >
                {strings('networks.learn_more')}
              </Text>
            </Text>
          }
          toggleModal={formHook.toggleWarningModal}
        />
      ) : null}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteNetworkModal
          ref={deleteModalRef}
          networkName={formHook.form.nickname || ''}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
        />
      )}
    </SafeAreaView>
  );

  return <KeyboardProvider>{content}</KeyboardProvider>;
};

export default NetworkDetailsView;
