import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  Card,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionHeader,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import {
  connectX,
  disconnectX,
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService';
import {
  selectIsConnectedToX,
  selectXProfile,
} from '../../../../selectors/profileController';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import {
  BIO_VALUE_MAX_WIDTH,
  PROFILE_FIELD_MAX_LENGTH,
  type Profile,
} from './ManageProfile.constants';
import ProfileRow from './ProfileRow';
import ProfileAvatar from './ProfileAvatar';
import ManageProfileFieldSheet, {
  ProfileFieldControl,
  type ProfileFieldValue,
} from './ManageProfileFieldSheet';
import ManageProfileDisconnectSheet from './ManageProfileDisconnectSheet';

const SECTION_TITLE_PROPS = {
  variant: TextVariant.BodySm,
  fontWeight: FontWeight.Medium,
  color: TextColor.TextAlternative,
};

/** The profile attributes that currently have an edit form. */
const EditableField = {
  DisplayName: 'displayName',
  Bio: 'bio',
  TradingActivity: 'tradingActivity',
} as const;

type EditableField = (typeof EditableField)[keyof typeof EditableField];

/** Unset fields read as a muted placeholder rather than an empty row. */
const valueOrPlaceholder = (value: string) =>
  value || strings('app_settings.manage_profile.not_set');

/**
 * Coerces an unknown thrown value to an Error so it can be passed to
 * Logger.error (which requires an Error) without unsafe casts.
 */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Safe metadata for logging caught errors: the error class name and, for
 * XAuthError, its error type. Never the full message — backend error text
 * can echo server-provided details.
 */
function logErrorMetadata(
  error: unknown,
): Record<string, string | number | boolean | undefined> {
  return {
    errorName: error instanceof Error ? error.name : 'unknown',
    errorType: error instanceof XAuthError ? error.type : undefined,
  };
}

/**
 * Flow logging for developer debugging in Metro/console output
 * (console.log in __DEV__, Sentry breadcrumb in production for opted-in
 * users). SECURITY: never log tokens, error messages, profile ids, or
 * account addresses — metadata only.
 */
const log = (
  message: string,
  data?: Record<string, string | number | boolean | undefined>,
) => Logger.log(`[XAuth][ManageProfile] ${message}`, data ?? '');

/**
 * Row value for the linked social account across its states: a connecting
 * indicator while the OAuth flow is in flight, the X handle once linked,
 * "Connected" when linked from another client without a local X profile, and
 * "None" when unlinked.
 */
const getLinkedSocialAccountValue = (
  isConnecting: boolean,
  isConnectedToX: boolean,
  xHandle: string | undefined,
): string => {
  if (isConnecting) {
    return strings('app_settings.manage_profile.connecting');
  }
  if (xHandle) {
    return xHandle;
  }
  return strings(
    isConnectedToX
      ? 'app_settings.manage_profile.connected'
      : 'app_settings.manage_profile.no_linked_account',
  );
};

/**
 * Distinct, plain copy for the failure classes a user can act on; everything
 * else (including non-XAuthError failures) falls back to a generic message.
 */
const getConnectErrorCopy = (error: unknown): string => {
  if (error instanceof XAuthError) {
    if (error.type === XAuthErrorType.NetworkFailure) {
      return strings('app_settings.manage_profile.connect_x_error_network');
    }
    if (error.type === XAuthErrorType.BackendError) {
      return strings('app_settings.manage_profile.connect_x_error_backend');
    }
  }
  return strings('app_settings.manage_profile.connect_x_error');
};

const ManageProfile = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { toastRef } = useContext(ToastContext);
  const isConnectedToX = useSelector(selectIsConnectedToX);
  const xProfile = useSelector(selectXProfile);

  // TODO: replace with the real profile source. Edits live here so the rows
  // reflect them, but nothing is persisted.
  const [profile, setProfile] = useState<Profile>({
    image: undefined,
    displayName: '',
    handle: '',
    bio: '',
    socialHandle: '',
    isTradingActivityVisible: false,
  });
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnectingRef = useRef(false);
  const [isDisconnectSheetOpen, setIsDisconnectSheetOpen] = useState(false);

  const xHandle = xProfile ? `@${xProfile.username}` : undefined;

  const showToast = useCallback(
    (label: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [{ label }],
        hasNoTimeout: false,
      });
    },
    [toastRef],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  /**
   * Starts the backend-mediated X connect flow. The linked account updates
   * via the ProfileController state change propagated through Redux.
   */
  const handleConnectX = useCallback(async () => {
    // Double-press guard: a rapid second tap can re-enter before the pending
    // state commits and start two OAuth sessions.
    if (isConnectingRef.current) {
      log('Connect X press ignored: connect already in flight');
      return;
    }
    isConnectingRef.current = true;
    log('Connect X pressed');
    setIsConnecting(true);

    try {
      await connectX();
      log('X connect succeeded');
    } catch (error) {
      // Cancelling the session or denying consent on X's screen is not an
      // error — the row stays as it is, silently.
      if (
        error instanceof XAuthError &&
        error.type === XAuthErrorType.UserCancelled
      ) {
        log('X connect cancelled by user');
        return;
      }
      log('X connect failed, showing toast', logErrorMetadata(error));
      Logger.error(toError(error), 'ManageProfile: X connect failed');
      showToast(getConnectErrorCopy(error));
    } finally {
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  }, [showToast]);

  /**
   * Disconnects the linked X account. Rejects after surfacing the failure so
   * the confirmation sheet stays open for a retry.
   */
  const handleDisconnectX = useCallback(async () => {
    try {
      await disconnectX();
      // isConnected updates via the ProfileController state change
      // propagated through Redux.
      log('X disconnect succeeded');
    } catch (error) {
      log('X disconnect failed, showing toast', logErrorMetadata(error));
      Logger.error(toError(error), 'ManageProfile: X disconnect failed');
      showToast(strings('app_settings.manage_profile.disconnect_x_error'));
      throw error;
    }
  }, [showToast]);

  const handlePressLinkedSocialAccount = useCallback(() => {
    if (isConnectedToX) {
      log('Linked social account pressed: opening disconnect confirmation');
      setIsDisconnectSheetOpen(true);
      return;
    }
    // handleConnectX never rejects; the row flips via Redux on success.
    handleConnectX();
  }, [isConnectedToX, handleConnectX]);

  const handleCloseDisconnectSheet = useCallback(
    () => setIsDisconnectSheetOpen(false),
    [],
  );

  const handleEditDisplayName = useCallback(
    () => setEditingField(EditableField.DisplayName),
    [],
  );
  const handleEditBio = useCallback(
    () => setEditingField(EditableField.Bio),
    [],
  );
  const handleEditTradingActivity = useCallback(
    () => setEditingField(EditableField.TradingActivity),
    [],
  );

  const handleCloseSheet = useCallback(() => setEditingField(null), []);

  const handleSaveField = useCallback(
    (value: ProfileFieldValue) => {
      setProfile((previous) => {
        if (editingField === EditableField.DisplayName) {
          return { ...previous, displayName: String(value) };
        }
        if (editingField === EditableField.Bio) {
          return { ...previous, bio: String(value) };
        }
        if (editingField === EditableField.TradingActivity) {
          return { ...previous, isTradingActivityVisible: Boolean(value) };
        }
        return previous;
      });
    },
    [editingField],
  );

  const sheetProps = useMemo(() => {
    switch (editingField) {
      case EditableField.DisplayName:
        return {
          title: strings('app_settings.manage_profile.display_name'),
          label: strings('app_settings.manage_profile.display_name'),
          control: ProfileFieldControl.Text,
          initialValue: profile.displayName,
          placeholder: strings(
            'app_settings.manage_profile.display_name_placeholder',
          ),
          maxLength: PROFILE_FIELD_MAX_LENGTH.displayName,
        };
      case EditableField.Bio:
        return {
          title: strings('app_settings.manage_profile.bio'),
          label: strings('app_settings.manage_profile.bio'),
          control: ProfileFieldControl.TextArea,
          initialValue: profile.bio,
          placeholder: strings('app_settings.manage_profile.bio_placeholder'),
        };
      case EditableField.TradingActivity:
        return {
          title: strings('app_settings.manage_profile.trading_activity'),
          label: strings('app_settings.manage_profile.show_trading_activity'),
          control: ProfileFieldControl.Switch,
          initialValue: profile.isTradingActivityVisible,
          describeValue: (isOn: boolean) =>
            isOn
              ? strings('app_settings.manage_profile.trading_activity_public')
              : strings('app_settings.manage_profile.trading_activity_private'),
          helperText: strings(
            'app_settings.manage_profile.trading_activity_footnote',
          ),
          appliesImmediately: true,
        };
      default:
        return null;
    }
  }, [editingField, profile]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ManageProfileSelectorsIDs.SAFE_AREA}
    >
      <HeaderStandard
        title={strings('app_settings.manage_profile.header')}
        onBack={handleBack}
        includesTopInset
        testID={ManageProfileSelectorsIDs.HEADER}
        backButtonProps={{
          testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
        }}
      />
      <ScrollView
        contentContainerStyle={tw.style('pb-8')}
        testID={ManageProfileSelectorsIDs.CONTENT}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="py-4">
          <ProfileAvatar
            src={profile.image}
            twClassName="bg-default"
            imageProps={{ contentFit: 'contain' }}
            accessibilityLabel={
              profile.displayName ||
              strings('app_settings.manage_profile.avatar_accessibility_label')
            }
            testID={ManageProfileSelectorsIDs.AVATAR}
          />
        </Box>

        <SectionHeader
          title={strings('app_settings.manage_profile.about')}
          titleProps={SECTION_TITLE_PROPS}
          testID={ManageProfileSelectorsIDs.ABOUT_SECTION}
        />
        <Card twClassName="mx-4 overflow-hidden p-0">
          <ProfileRow
            title={strings('app_settings.manage_profile.display_name')}
            value={valueOrPlaceholder(profile.displayName)}
            onPress={handleEditDisplayName}
            testID={ManageProfileSelectorsIDs.DISPLAY_NAME_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('app_settings.manage_profile.handle')}
            value={valueOrPlaceholder(profile.handle)}
            testID={ManageProfileSelectorsIDs.HANDLE_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('app_settings.manage_profile.bio')}
            value={valueOrPlaceholder(profile.bio)}
            valueMaxWidth={BIO_VALUE_MAX_WIDTH}
            onPress={handleEditBio}
            testID={ManageProfileSelectorsIDs.BIO_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('app_settings.manage_profile.socials')}
            value={valueOrPlaceholder(profile.socialHandle)}
            valueStartAccessory={
              profile.socialHandle ? (
                <Icon
                  name={IconName.X}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              ) : undefined
            }
            testID={ManageProfileSelectorsIDs.SOCIALS_ROW}
          />
        </Card>

        <SectionHeader
          title={strings('app_settings.manage_profile.privacy')}
          titleProps={SECTION_TITLE_PROPS}
          testID={ManageProfileSelectorsIDs.PRIVACY_SECTION}
        />
        <Card twClassName="mx-4 overflow-hidden p-0">
          <ProfileRow
            title={strings('app_settings.manage_profile.trading_activity')}
            value={
              profile.isTradingActivityVisible
                ? strings('app_settings.manage_profile.on')
                : strings('app_settings.manage_profile.off')
            }
            valueStartAccessory={
              <Icon
                name={IconName.Lock}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            onPress={handleEditTradingActivity}
            testID={ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('app_settings.manage_profile.linked_social_account')}
            value={getLinkedSocialAccountValue(
              isConnecting,
              isConnectedToX,
              xHandle,
            )}
            valueStartAccessory={
              xHandle ? (
                <Icon
                  name={IconName.X}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              ) : undefined
            }
            onPress={handlePressLinkedSocialAccount}
            testID={ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW}
          />
        </Card>
      </ScrollView>

      {sheetProps ? (
        <ManageProfileFieldSheet
          {...sheetProps}
          onSave={handleSaveField}
          onClose={handleCloseSheet}
        />
      ) : null}

      {isDisconnectSheetOpen ? (
        <ManageProfileDisconnectSheet
          xProfile={xProfile}
          onDisconnect={handleDisconnectX}
          onClose={handleCloseDisconnectSheet}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default ManageProfile;
