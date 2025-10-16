import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import Intercom from '@intercom/intercom-react-native';
import StorageWrapper from '../../store/storage-wrapper';

const INTERCOM_EMAIL_KEY = '@MetaMask:intercomEmail';

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Gets stored Intercom email from local storage
 * @returns {Promise<string|null>} - Stored email or null
 */
export const getStoredIntercomEmail = async () => {
  try {
    return await StorageWrapper.getItem(INTERCOM_EMAIL_KEY);
  } catch (error) {
    return null;
  }
};

/**
 * Clears stored Intercom email (useful for testing)
 * @returns {Promise<void>}
 */
export const clearStoredIntercomEmail = async () => {
  try {
    await StorageWrapper.removeItem(INTERCOM_EMAIL_KEY);
  } catch (error) {
    // Silent error handling
  }
};

/**
 * Shows native iOS prompt to collect user email for Intercom
 * @returns {Promise<void>}
 */
export const showIntercomEmailPrompt = () => new Promise((resolve) => {
    Alert.prompt(
      'Get Support',
      'Enter your email to connect with our support team',
      [
        {
          text: 'Skip',
          style: 'cancel',
          onPress: () => {
            // Open Intercom even when skipping email
            Intercom.present();
            resolve(false);
          },
        },
        {
          text: 'Continue',
          onPress: async (email) => {
            if (!email || !email.trim()) {
              // Open Intercom even if no email provided
              Intercom.present();
              resolve(false);
              return;
            }

            const trimmedEmail = email.trim();

            if (!validateEmail(trimmedEmail)) {
              Alert.alert(
                'Invalid Email',
                'Please enter a valid email address',
              );
              resolve(false);
              return;
            }

            try {
              // Store email locally
              await StorageWrapper.setItem(INTERCOM_EMAIL_KEY, trimmedEmail);

              // Login to Intercom
              await Intercom.loginUserWithUserAttributes({
                email: trimmedEmail,
              });

              // Open Intercom after successful login
              Intercom.present();

              resolve(true);
            } catch (error) {
              // Open Intercom even if error
              Intercom.present();
              resolve(false);
            }
          },
        },
      ],
      'plain-text',
      '',
      'email-address',
    );
  });

/**
 * Handles Intercom button press - shows prompt if no email, opens Intercom if email exists
 * @param {string|null} storedEmail - Currently stored email
 * @returns {Promise<void>}
 */
export const handleIntercomButtonPress = async (storedEmail) => {
  if (storedEmail) {
    // User already has email, open Intercom directly
    Intercom.present();
  } else {
    // Show email collection prompt
    await showIntercomEmailPrompt();
  }
};

/**
 * Initializes Intercom with stored email on app launch
 * @returns {Promise<string|null>} - Stored email or null
 */
export const initializeIntercomWithStoredEmail = async () => {
  try {
    const storedEmail = await getStoredIntercomEmail();
    if (storedEmail) {
      // Login to Intercom with stored email
      await Intercom.loginUserWithUserAttributes({
        email: storedEmail,
      });
    }
    return storedEmail;
  } catch (error) {
    return null;
  }
};

/**
 * Handles long-press on Intercom button to reset email
 * @param {string|null} currentEmail - Currently stored email
 * @param {Function} onReset - Callback to update state after reset
 * @returns {void}
 */
export const handleIntercomLongPress = (currentEmail, onReset) => {
  if (!currentEmail) return;

  Alert.alert(
    'Reset Support Email',
    'Do you want to remove your saved email? You will be asked to enter it again next time.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await clearStoredIntercomEmail();
          if (onReset) {
            onReset(null);
          }
        },
      },
    ],
  );
};

/**
 * Custom hook to manage Intercom state and initialization
 * @returns {Object} - { intercomEmail, handlePress, handleLongPress }
 */
export const useIntercom = () => {
  const [intercomEmail, setIntercomEmail] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      const email = await initializeIntercomWithStoredEmail();
      setIntercomEmail(email);
    };
    initialize();
  }, []);

  const handlePress = async () => {
    if (intercomEmail) {
      // User already has email, open Intercom directly
      Intercom.present();
    } else {
      // Show email collection prompt and update state if email was saved
      const success = await showIntercomEmailPrompt();
      if (success) {
        const email = await getStoredIntercomEmail();
        setIntercomEmail(email);
      }
    }
  };

  const handleLongPress = () =>
    handleIntercomLongPress(intercomEmail, setIntercomEmail);

  return { intercomEmail, handlePress, handleLongPress };
};
