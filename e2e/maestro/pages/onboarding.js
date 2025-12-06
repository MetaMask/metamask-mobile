// onboarding.js
// Page Object for MetaMask onboarding screens

/* global output */

output.onboarding = {
  // Welcome Screen
  welcome: {
    //text: "Let’s get started!",
    text: 'Let’s get started!',
    createNewWalletBtn: 'wallet-setup-screen-create-new-wallet-button-id',
  },

  // Create Password Screen
  createPassword: {
    title: 'MetaMask password',
    firstPasswordInput: 'create-password-first-input-field',
    secondPasswordInput: 'create-password-second-input-field',
    termsCheckbox: 'checkbox-text',
    submitBtn: 'submit-button',
  },

  // Backup/Security Modal
  backup: {
    remindMeLaterBtn: 'remind-me-later-button',
    skipTitle: 'Skip account security?',
    skipText: 'skip-backup-text',
    skipBtn: 'Skip-button',
  },

  // MetaMetrics Screen
  metrics: {
    optinBtn: 'optin-metrics-continue-button-id',
  },

  // Default Settings Screen
  default_settings: {
    //remindLaterMessage: "We'll remind you later"
    remindLaterMessage: 'We’ll remind you later',
    doneBtn: 'onboarding-success-done-button',
  },

  // Perps Modal
  perps: {
    title: 'PERPS ARE HERE',
    notNowBtn: 'perps-not-now-button',
  },
};
