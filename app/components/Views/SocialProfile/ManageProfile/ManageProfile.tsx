import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
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

import Routes from '../../../../constants/navigation/Routes';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import {
  connectX,
  XAuthError,
  XAuthErrorType,
} from '../../../../core/XAuthService';
import {
  selectIsConnectedToX,
  selectProfileControllerXProfile,
} from '../../../../selectors/profileController';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import { BIO_VALUE_MAX_WIDTH, type Profile } from './ManageProfile.constants';
import ProfileRow from './ProfileRow';
import ProfileAvatar from './ProfileAvatar';
import {
  ManageProfileFieldName,
  type ManageProfileFieldUpdate,
} from './ManageProfileField.types';

const SECTION_TITLE_PROPS = {
  variant: TextVariant.BodySm,
  fontWeight: FontWeight.Medium,
  color: TextColor.TextAlternative,
};

/** Unset fields read as a muted placeholder rather than an empty row. */
const valueOrPlaceholder = (value: string) =>
  value || strings('manage_profile.not_set');

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
 * Row value for the X account across its states: a connecting indicator
 * while the OAuth flow is in flight, the X handle once linked, "Connected"
 * when linked from another client without a local X profile, and empty
 * (rendered as the unset placeholder) when unlinked.
 */
const getXAccountValue = (
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
  if (isConnectedToX) {
    return strings('app_settings.manage_profile.connected');
  }
  return '';
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

const applyFieldUpdate = (
  profile: Profile,
  update: ManageProfileFieldUpdate,
): Profile => {
  switch (update.field) {
    case ManageProfileFieldName.DisplayName:
      return { ...profile, displayName: String(update.value) };
    case ManageProfileFieldName.Bio:
      return { ...profile, bio: String(update.value) };
    case ManageProfileFieldName.TradingActivity:
      return { ...profile, isTradingActivityVisible: Boolean(update.value) };
    default:
      return profile;
  }
};

// TODO: replace with the real profile source. Edits live here so the rows
// reflect them, but nothing is persisted.
const EMPTY_PROFILE: Profile = {
  image: undefined,
  displayName: '',
  handle: '',
  bio: '',
  isTradingActivityVisible: false,
  linkedSocialAccountName: '',
};

const ManageProfile = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ManageProfile'>>();
  const { toastRef } = useContext(ToastContext);
  const isConnectedToX = useSelector(selectIsConnectedToX);
  const xProfile = useSelector(selectProfileControllerXProfile);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnectingRef = useRef(false);

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

  const fieldUpdate = route.params?.fieldUpdate;
  const consumedUpdate = useRef<ManageProfileFieldUpdate | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!fieldUpdate || fieldUpdate === consumedUpdate.current) {
      return;
    }
    consumedUpdate.current = fieldUpdate;
    setProfile((previous) => applyFieldUpdate(previous, fieldUpdate));
    navigation.setParams({ fieldUpdate: undefined });
  }, [fieldUpdate, navigation]);

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

  const handleOpenLinkedSocialAccount = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_PROFILE.LINKED_SOCIAL_ACCOUNT);
  }, [navigation]);

  const handleEditDisplayName = useCallback(
    () =>
      navigation.navigate(Routes.SOCIAL_PROFILE.MANAGE_PROFILE_FIELD, {
        field: ManageProfileFieldName.DisplayName,
        initialValue: profile.displayName,
      }),
    [navigation, profile.displayName],
  );
  const handleEditBio = useCallback(
    () =>
      navigation.navigate(Routes.SOCIAL_PROFILE.MANAGE_PROFILE_FIELD, {
        field: ManageProfileFieldName.Bio,
        initialValue: profile.bio,
      }),
    [navigation, profile.bio],
  );
  const handleEditTradingActivity = useCallback(
    () =>
      navigation.navigate(Routes.SOCIAL_PROFILE.MANAGE_PROFILE_FIELD, {
        field: ManageProfileFieldName.TradingActivity,
        initialValue: profile.isTradingActivityVisible,
      }),
    [navigation, profile.isTradingActivityVisible],
  );

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ManageProfileSelectorsIDs.SAFE_AREA}
    >
      <HeaderStandard
        title={strings('manage_profile.header')}
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
              strings('manage_profile.avatar_accessibility_label')
            }
            testID={ManageProfileSelectorsIDs.AVATAR}
          />
        </Box>

        <SectionHeader
          title={strings('manage_profile.about')}
          titleProps={SECTION_TITLE_PROPS}
          testID={ManageProfileSelectorsIDs.ABOUT_SECTION}
        />
        <Card twClassName="mx-4 overflow-hidden p-0">
          <ProfileRow
            title={strings('manage_profile.display_name')}
            value={valueOrPlaceholder(profile.displayName)}
            onPress={handleEditDisplayName}
            testID={ManageProfileSelectorsIDs.DISPLAY_NAME_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('manage_profile.handle')}
            value={valueOrPlaceholder(profile.handle)}
            testID={ManageProfileSelectorsIDs.HANDLE_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('manage_profile.bio')}
            value={valueOrPlaceholder(profile.bio)}
            valueMaxWidth={BIO_VALUE_MAX_WIDTH}
            onPress={handleEditBio}
            testID={ManageProfileSelectorsIDs.BIO_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('manage_profile.x_account')}
            value={valueOrPlaceholder(
              getXAccountValue(isConnecting, isConnectedToX, xHandle),
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
            testID={ManageProfileSelectorsIDs.X_ACCOUNT_ROW}
            onPress={isConnectedToX ? undefined : handleConnectX}
          />
        </Card>

        <SectionHeader
          title={strings('manage_profile.privacy')}
          titleProps={SECTION_TITLE_PROPS}
          testID={ManageProfileSelectorsIDs.PRIVACY_SECTION}
        />
        <Card twClassName="mx-4 overflow-hidden p-0">
          <ProfileRow
            title={strings('manage_profile.trading_activity')}
            value={
              profile.isTradingActivityVisible
                ? strings('manage_profile.on')
                : strings('manage_profile.off')
            }
            valueStartAccessory={
              <Icon
                name={IconName.Lock}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            testID={ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW}
            onPress={handleEditTradingActivity}
          />
          <ProfileRow
            showDivider
            title={strings('manage_profile.linked_social_account')}
            value={
              profile.linkedSocialAccountName ||
              strings('manage_profile.no_linked_account')
            }
            valueStartAccessory={
              profile.linkedSocialAccountAddress ? (
                <AvatarAccount
                  address={profile.linkedSocialAccountAddress}
                  variant={AvatarAccountVariant.Maskicon}
                  size={AvatarAccountSize.Xs}
                />
              ) : undefined
            }
            onPress={handleOpenLinkedSocialAccount}
            testID={ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageProfile;
