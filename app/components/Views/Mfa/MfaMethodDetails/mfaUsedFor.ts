import { IconName } from '@metamask/design-system-react-native';
import type { MfaMethod } from '../../../../util/identity/mfa/engine/types';

export interface MfaUsedForContext {
  /** Whether the wallet comes from social login rather than an SRP. */
  isSocialLogin: boolean;
}

export interface MfaUsedFor {
  key: string;
  icon: IconName;
  /** Locale key. */
  label: string;
  /** The methods this use accepts. */
  methods: MfaMethod[];
  /** Leave out to show the row to every user. */
  isShown?: (context: MfaUsedForContext) => boolean;
}

/**
 * What the methods protect, in display order, under "Used for". Each entry
 * belongs to the team that owns the use: it lists the methods it accepts,
 * and `isShown` limits it to some users.
 */
export const MFA_USED_FOR: MfaUsedFor[] = [
  {
    key: 'money',
    icon: IconName.SecurityTick,
    label: 'mfa.settings.used_for_money',
    methods: ['passkey', 'email_otp', 'totp'],
  },
];

export const getMfaUsedFor = (
  method: MfaMethod,
  context: MfaUsedForContext,
  usedFor: MfaUsedFor[] = MFA_USED_FOR,
): MfaUsedFor[] =>
  usedFor.filter(
    ({ methods, isShown }) =>
      methods.includes(method) && (isShown?.(context) ?? true),
  );
