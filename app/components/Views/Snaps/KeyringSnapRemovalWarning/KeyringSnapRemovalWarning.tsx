///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { View, TextInput } from 'react-native';
import {
  ScrollView,
  NativeViewGestureHandler,
} from 'react-native-gesture-handler';
import { Snap } from '@metamask/snaps-utils';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { InternalAccount } from '@metamask/keyring-internal-api';
import BannerAlert from '../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../component-library/components/Banners/Banner';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useStyles } from '../../../hooks/useStyles';
import stylesheet from './KeyringSnapRemovalWarning.styles';
import { strings } from '../../../../../locales/i18n';
import { KeyringAccountListItem } from '../components/KeyringAccountListItem';
import { getAccountLink } from '@metamask/etherscan-link';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../../selectors/networkController';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button/Button.types';
import {
  KEYRING_SNAP_REMOVAL_WARNING,
  KEYRING_SNAP_REMOVAL_WARNING_CANCEL,
  KEYRING_SNAP_REMOVAL_WARNING_CONTINUE,
  KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT,
} from './KeyringSnapRemovalWarning.constants';
import Logger from '../../../../util/Logger';

interface KeyringSnapRemovalWarningProps {
  snap: Snap;
  keyringAccounts: InternalAccount[];
  onCancel: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function KeyringSnapRemovalWarning({
  snap,
  keyringAccounts,
  onCancel,
  onClose,
  onSubmit,
}: KeyringSnapRemovalWarningProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedRemoval, setConfirmedRemoval] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [error, setError] = useState(false);
  const { chainId } = useSelector(selectProviderConfig);
  const { styles } = useStyles(stylesheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    setShowConfirmation(keyringAccounts.length === 0);
  }, [keyringAccounts]);

  const validateConfirmationInput = useCallback(
    (input: string): boolean => input === snap.manifest.proposedName,
    [snap.manifest.proposedName],
  );

  const handleConfirmationInputChange = useCallback(
    (text: string) => {
      setConfirmationInput(text);
      setConfirmedRemoval(validateConfirmationInput(text));
    },
    [validateConfirmationInput],
  );

  const handleContinuePress = useCallback(() => {
    if (!showConfirmation) {
      setShowConfirmation(true);
    } else if (confirmedRemoval) {
      try {
        onSubmit();
      } catch (e) {
        Logger.error(
          e as Error,
          'KeyringSnapRemovalWarning: error while removing snap',
        );
        setError(true);
      }
    }
  }, [showConfirmation, confirmedRemoval, onSubmit]);

  const cancelButtonProps: ButtonProps = useMemo(
    () => ({
      variant: ButtonVariants.Secondary,
      label: strings(
        'app_settings.snaps.snap_settings.remove_account_snap_warning.cancel_button',
      ),
      size: ButtonSize.Lg,
      onPress: onCancel,
      testID: KEYRING_SNAP_REMOVAL_WARNING_CANCEL,
    }),
    [onCancel],
  );

  const continueButtonProps: ButtonProps = useMemo(
    () => ({
      variant: ButtonVariants.Primary,
      label: showConfirmation
        ? strings(
            'app_settings.snaps.snap_settings.remove_account_snap_warning.remove_snap_button',
          )
        : strings(
            'app_settings.snaps.snap_settings.remove_account_snap_warning.continue_button',
          ),
      size: ButtonSize.Lg,
      onPress: handleContinuePress,
      isDisabled: showConfirmation && !confirmedRemoval,
      isDanger: showConfirmation,
      testID: KEYRING_SNAP_REMOVAL_WARNING_CONTINUE,
    }),
    [showConfirmation, confirmedRemoval, handleContinuePress],
  );

  const buttonPropsArray = useMemo(
    () => [cancelButtonProps, continueButtonProps],
    [cancelButtonProps, continueButtonProps],
  );

  const accountListItems = useMemo(
    () =>
      keyringAccounts.map((account, index) => (
        <KeyringAccountListItem
          key={index}
          account={account}
          blockExplorerUrl={getAccountLink(account.address, chainId)}
        />
      )),
    [keyringAccounts, chainId],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      isFullscreen={false}
      onClose={onClose}
      shouldNavigateBack={false}
      testID={KEYRING_SNAP_REMOVAL_WARNING}
      style={styles.bottomSheet}
    >
      <View style={styles.container}>
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>
            {strings(
              'app_settings.snaps.snap_settings.remove_account_snap_warning.title',
            )}
          </Text>
        </BottomSheetHeader>
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          title={strings(
            'app_settings.snaps.snap_settings.remove_account_snap_warning.banner_title',
          )}
        />
        {showConfirmation ? (
          <>
            <Text variant={TextVariant.BodyMD} style={styles.description}>
              {`${strings(
                'app_settings.snaps.snap_settings.remove_account_snap_warning.remove_account_snap_alert_description_1',
              )} `}
              <Text variant={TextVariant.BodyMDBold}>
                {snap.manifest.proposedName}
              </Text>
              {` ${strings(
                'app_settings.snaps.snap_settings.remove_account_snap_warning.remove_account_snap_alert_description_2',
              )}`}
            </Text>
            <TextInput
              style={styles.input}
              value={confirmationInput}
              onChangeText={handleConfirmationInputChange}
              testID={KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT}
            />
            {error && (
              <Text variant={TextVariant.BodySM} style={styles.errorText}>
                {strings(
                  'app_settings.snaps.snap_settings.remove_account_snap_warning.remove_snap_error',
                  {
                    snapName: snap.manifest.proposedName,
                  },
                )}
              </Text>
            )}
          </>
        ) : (
          <>
            <Text variant={TextVariant.BodyMD} style={styles.description}>
              {strings(
                'app_settings.snaps.snap_settings.remove_account_snap_warning.description',
              )}
            </Text>
            <NativeViewGestureHandler disallowInterruption>
              <ScrollView style={styles.scrollView}>
                {accountListItems}
              </ScrollView>
            </NativeViewGestureHandler>
          </>
        )}
      </View>
      <BottomSheetFooter
        style={styles.buttonContainer}
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={buttonPropsArray}
      />
    </BottomSheet>
  );
}
///: END:ONLY_INCLUDE_IF
