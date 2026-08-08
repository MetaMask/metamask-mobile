import { Alert } from 'react-native';
import ClipboardManager from '../../../../core/ClipboardManager';

const DEV_ENVIRONMENTS = new Set(['rc', 'exp', 'dev', 'test']);

const SUPPRESSED_ERRORS = [
  'MetaMask Tx Signature: User denied transaction signature.',
];

/**
 * In non-production builds (rc / exp / dev / test) shows a native Alert
 * containing the full error stack trace, with a one-tap "Copy" button.
 *
 * Certain expected user-cancellation errors are suppressed so testers are
 * not spammed by intentional flows.
 *
 * NOTE: `process.env.METAMASK_ENVIRONMENT` is inlined by Babel's
 * `transform-inline-environment-variables` at build time, so runtime
 * `process.env` mutations in tests have no effect. Pass `envOverride`
 * explicitly in tests to exercise the environment-gating logic.
 */
export function showDevErrorAlert(
  title: string,
  error: Error,
  envOverride?: string,
): void {
  // eslint-disable-next-line dot-notation
  const env = envOverride ?? process.env['METAMASK_ENVIRONMENT'] ?? '';
  if (!DEV_ENVIRONMENTS.has(env)) {
    return;
  }

  if (SUPPRESSED_ERRORS.some((msg) => error.message.includes(msg))) {
    return;
  }

  const stackTrace = error.stack ?? error.message;
  Alert.alert(title, stackTrace, [
    {
      text: 'Copy',
      onPress: () => ClipboardManager.setString(stackTrace),
    },
    { text: 'Dismiss', style: 'cancel' },
  ]);
}
