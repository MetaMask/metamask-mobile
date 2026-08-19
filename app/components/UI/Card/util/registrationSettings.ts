import AppConstants from '../../../../core/AppConstants';
import {
  CARD_SUPPORT_EMAIL,
  CRB_ACCOUNT_OPENING_URL,
  CRB_PRIVACY_NOTICE_URL,
  CRB_TERMS_URL,
} from '../constants';
import type { CardLocation, RegistrationSettingsResponse } from '../types';

type RegistrationSettings = RegistrationSettingsResponse | null | undefined;

export const toOpenableUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+(\/|\?|#|$)/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
};

export const getCardTermsAndConditionsUrl = (
  registrationSettings: RegistrationSettings,
  location: CardLocation | null | undefined,
): string => {
  const dynamicUrl =
    location === 'us'
      ? registrationSettings?.links?.us?.termsAndConditions
      : registrationSettings?.links?.intl?.termsAndConditions;

  return toOpenableUrl(dynamicUrl) ?? AppConstants.CARD.CARD_TOS_URL;
};

export const getCardSupportEmail = (
  registrationSettings: RegistrationSettings,
  location: CardLocation | null | undefined,
): string => {
  const dynamicEmail =
    location === 'us'
      ? registrationSettings?.config?.us?.supportEmail
      : registrationSettings?.config?.intl?.supportEmail;

  return dynamicEmail?.trim() || CARD_SUPPORT_EMAIL;
};

export const getCardUsDisclosureUrls = (
  registrationSettings: RegistrationSettings,
) => ({
  eSignConsentDisclosureUSUrl:
    toOpenableUrl(registrationSettings?.links?.us?.eSignConsentDisclosure) ??
    '',
  crbTermsUrl:
    toOpenableUrl(registrationSettings?.links?.us?.termsAndConditions) ??
    CRB_TERMS_URL,
  crbAccountOpeningUrl:
    toOpenableUrl(registrationSettings?.links?.us?.accountOpeningDisclosure) ??
    CRB_ACCOUNT_OPENING_URL,
  crbNoticeOfPrivacyUrl:
    toOpenableUrl(registrationSettings?.links?.us?.noticeOfPrivacy) ??
    CRB_PRIVACY_NOTICE_URL,
});
