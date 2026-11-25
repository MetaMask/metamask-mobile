/**
 * Re-export from shared so Settings (ResetPassword) can reuse Verify without
 * importing OAuthRehydration (ADR-0020). Keep this barrel for existing recovery
 * imports under WalletRecovery/.
 */
export {
  default,
  type WalletRecoveryMethod,
  type WalletRecoveryVerifyProps,
} from '../../shared/WalletRecoveryVerify/WalletRecoveryVerify';
