import { strings } from '../../../../../locales/i18n';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

export function getCardProviderErrorMessage(err: unknown): string {
  if (err instanceof CardProviderError) {
    const withCode = (message: string) =>
      err.errorCode ? `${message} (${err.errorCode})` : message;
    switch (err.code) {
      case CardProviderErrorCode.InvalidCredentials:
        return strings('card.card_authentication.errors.invalid_credentials');
      case CardProviderErrorCode.AccountDisabled:
        return err.message;
      case CardProviderErrorCode.InvalidOtp:
        return strings('card.card_authentication.errors.invalid_otp_code');
      case CardProviderErrorCode.Network:
        return strings('card.card_authentication.errors.network_error');
      case CardProviderErrorCode.Timeout:
        return strings('card.card_authentication.errors.timeout_error');
      case CardProviderErrorCode.ServerError:
        return strings('card.card_authentication.errors.server_error');
      case CardProviderErrorCode.Forbidden:
        return withCode(
          strings('card.card_authentication.errors.forbidden_error'),
        );
      default:
        return withCode(
          strings('card.card_authentication.errors.unknown_error'),
        );
    }
  }
  return strings('card.card_authentication.errors.unknown_error');
}
