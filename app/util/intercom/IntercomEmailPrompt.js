import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, TextInput, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Intercom from '@intercom/intercom-react-native';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../Logger';
import BottomSheet from '../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../component-library/components/BottomSheets/BottomSheetFooter';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../component-library/components/Texts/Text';
import {
  ButtonVariants,
  ButtonSize,
} from '../../component-library/components/Buttons/Button';
import { useTheme } from '../theme';
import { useStyles } from '../../component-library/hooks';

// Storage key for persisting Intercom email
const STORAGE_KEY = '@MetaMask:intercomEmail';

// Basic email validation
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Email storage wrapper - fails silently to prevent crashes
const storage = {
  get: async () => {
    try {
      return await StorageWrapper.getItem(STORAGE_KEY);
    } catch {
      // Fail silently - storage errors shouldn't crash the app
      return null;
    }
  },
  save: async (email) => {
    try {
      await StorageWrapper.setItem(STORAGE_KEY, email);
    } catch {
      // Fail silently - storage errors shouldn't crash the app
    }
  },
  clear: async () => {
    try {
      await StorageWrapper.removeItem(STORAGE_KEY);
    } catch {
      // Fail silently - storage errors shouldn't crash the app
    }
  },
};

// Login to Intercom - this is when device data is sent to Intercom servers
const loginToIntercom = async (email = null) => {
  try {
    if (email) {
      await Intercom.loginUserWithUserAttributes({
        email,
        customAttributes: {
          last_platform: Platform.OS,
        },
      });
    } else {
      await Intercom.loginUnidentifiedUser();
      // For unidentified users, update platform after login
      await Intercom.updateUser({
        customAttributes: {
          last_platform: Platform.OS,
        },
      });
    }
    Logger.log(`[Intercom] Login completed with platform: ${Platform.OS}`);
  } catch (error) {
    Logger.error('Intercom login failed:', error);
  }
};

// Hook to verify Intercom SDK is ready
// Native initialization happens in AppDelegate.m / MainApplication.kt
// No user login here - that only happens when button is clicked (privacy-first)
export const useIntercomInitialization = () => {
  useEffect(() => {
    if (
      process.env.MM_INTERCOM_ENABLED !== 'true' ||
      process.env.METAMASK_ENVIRONMENT !== 'beta'
    ) {
      return;
    }

    Logger.log('Intercom: SDK ready (login will happen on user interaction)');
  }, []);
};

const styleSheet = ({ theme: { colors } }) => ({
  container: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.muted,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 16,
    color: colors.text.default,
    backgroundColor: colors.background.default,
  },
  footer: {
    paddingHorizontal: 16,
  },
});

const EmailPromptModal = ({ sheetRef, onSubmit, onSkip, onClose }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { colors, themeAppearance } = useTheme();
  const { styles } = useStyles(styleSheet, {});

  const handleContinue = useCallback(() => {
    const trimmed = email.trim();
    if (isValidEmail(trimmed)) {
      setError('');
      setEmail('');
      onSubmit(trimmed);
    } else {
      setError('Please enter a valid email address');
    }
  }, [email, onSubmit]);

  const handleSkip = useCallback(() => {
    setEmail('');
    setError('');
    onSkip();
  }, [onSkip]);

  return (
    <BottomSheet ref={sheetRef} onClose={onClose} shouldNavigateBack={false}>
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>Log in</Text>
      </BottomSheetHeader>
      <Box style={styles.container}>
        <Text variant={TextVariant.BodyMD}>
          Please enter your email address
        </Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          placeholderTextColor={colors.text.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError('');
          }}
          onSubmitEditing={handleContinue}
          keyboardAppearance={themeAppearance}
          autoFocus
        />
        {error ? (
          <Text variant={TextVariant.BodySM} color={TextColor.Error}>
            {error}
          </Text>
        ) : null}
      </Box>
      <BottomSheetFooter
        style={styles.footer}
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[
          {
            variant: ButtonVariants.Secondary,
            label: 'Skip',
            size: ButtonSize.Lg,
            onPress: handleSkip,
          },
          {
            variant: ButtonVariants.Primary,
            label: 'Continue',
            size: ButtonSize.Lg,
            onPress: handleContinue,
          },
        ]}
      />
    </BottomSheet>
  );
};

EmailPromptModal.propTypes = {
  sheetRef: PropTypes.object.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// Main hook for Intercom functionality
export const useIntercom = () => {
  const [email, setEmail] = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const sheetRef = useRef(null);

  // Load stored email on mount (but don't login yet - privacy-first)
  useEffect(() => {
    (async () => {
      const stored = await storage.get();
      if (stored) {
        setEmail(stored);
      }
    })();
  }, []);

  const handleEmailSubmit = useCallback(async (submittedEmail) => {
    await storage.save(submittedEmail);
    setEmail(submittedEmail);
    setShowSheet(false);
    await loginToIntercom(submittedEmail);
    setIsLoggedIn(true);
    Intercom.present();
  }, []);

  const handleEmailSkip = useCallback(async () => {
    setShowSheet(false);
    await loginToIntercom(null);
    Intercom.present();
  }, []);

  const handlePress = useCallback(async () => {
    if (email) {
      if (!isLoggedIn) {
        await loginToIntercom(email);
        setIsLoggedIn(true);
      }
      Intercom.present();
    } else {
      setShowSheet(true);
      setTimeout(() => sheetRef.current?.onOpenBottomSheet(), 100);
    }
  }, [email, isLoggedIn]);

  const handleLongPress = useCallback(() => {
    Alert.alert('Reset email', 'Clear your saved email?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await storage.clear();
          setEmail(null);
          setIsLoggedIn(false);
          try {
            await Intercom.logout();
          } catch (error) {
            Logger.error('Intercom logout failed:', error);
          }
        },
      },
    ]);
  }, []);

  const handleSheetClose = useCallback(() => setShowSheet(false), []);

  return {
    handlePress,
    handleLongPress,
    EmailPrompt: () =>
      showSheet ? (
        <EmailPromptModal
          sheetRef={sheetRef}
          onSubmit={handleEmailSubmit}
          onSkip={handleEmailSkip}
          onClose={handleSheetClose}
        />
      ) : null,
  };
};
