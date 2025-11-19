import { CardError, CardErrorType } from '../types';
import { strings } from '../../../../../locales/i18n';

/**
 * Maps CardError types to user-friendly localized error messages
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof CardError) {
    switch (error.type) {
      case CardErrorType.CONFLICT_ERROR:
        if (error.message.includes('Email already exists')) {
          return strings('card.card_onboarding.errors.email_already_exists');
        }
        if (error.message.includes('Invalid email format')) {
          return strings('card.card_onboarding.errors.invalid_email_format');
        }
        if (error.message.includes('no valid verification code')) {
          return strings(
            'card.card_onboarding.errors.invalid_verification_code',
          );
        }
        if (error.message.includes('Verification code has expired')) {
          return strings(
            'card.card_onboarding.errors.verification_code_expired',
          );
        }
        if (
          error.message.includes('Invalid or expired contact verification ID')
        ) {
          return strings(
            'card.card_onboarding.errors.invalid_contact_verification_id',
          );
        }
        if (error.message.includes('Invalid phone number format')) {
          return strings('card.card_onboarding.errors.invalid_phone_format');
        }
        if (error.message.includes('Phone number already exists')) {
          return strings('card.card_onboarding.errors.phone_already_exists');
        }
        if (
          error.message.includes(
            'Phone number does not match verification session',
          )
        ) {
          return strings('card.card_onboarding.errors.phone_number_mismatch');
        }
        if (error.message.includes('Invalid zip code format')) {
          return strings('card.card_onboarding.errors.invalid_zip_code');
        }
        if (error.message.includes('US state is required')) {
          return strings('card.card_onboarding.errors.us_state_required');
        }
        if (error.message.includes('already linked to a user')) {
          return strings('card.card_onboarding.errors.consent_already_linked');
        }

        if (error.message.includes('Onboarding ID not found')) {
          return strings('card.card_onboarding.errors.invalid_onboarding_id');
        }
        if (error.message.includes('Create user failed')) {
          return strings('card.card_onboarding.errors.create_user_failed');
        }

        return error.message;
      case CardErrorType.NETWORK_ERROR:
        return strings('card.card_authentication.errors.network_error');
      case CardErrorType.TIMEOUT_ERROR:
        return strings('card.card_authentication.errors.timeout_error');
      case CardErrorType.API_KEY_MISSING:
        return strings('card.card_authentication.errors.configuration_error');
      case CardErrorType.VALIDATION_ERROR:
        return strings(
          'card.card_authentication.errors.invalid_email_or_password',
        );
      case CardErrorType.SERVER_ERROR:
        return strings('card.card_authentication.errors.server_error');
      case CardErrorType.UNKNOWN_ERROR:
      default:
        return strings('card.card_authentication.errors.unknown_error');
    }
  }

  // Fallback for non-CardError instances
  return strings('card.card_authentication.errors.unknown_error');
};
