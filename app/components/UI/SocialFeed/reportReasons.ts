/**
 * Report categories for a post or a profile. The value is what
 * `SocialService:block` stores. Impersonation is never sent: that claim
 * goes to customer support instead.
 */
export enum SocialEntryReportReason {
  ScamsAndPhishing = 'scams_and_phishing',
  Impersonation = 'impersonation',
  FinancialConduct = 'financial_conduct',
  SpamAndFakeEngagement = 'spam_and_fake_engagement',
  HarassmentHateAndThreats = 'harassment_hate_and_threats',
  Privacy = 'privacy',
  SexualAndGraphicContent = 'sexual_and_graphic_content',
  IllegalAndDangerous = 'illegal_and_dangerous',
  ProfileText = 'profile_text',
}

export const SOCIAL_REPORT_REASONS = [
  SocialEntryReportReason.ScamsAndPhishing,
  SocialEntryReportReason.Impersonation,
  SocialEntryReportReason.FinancialConduct,
  SocialEntryReportReason.SpamAndFakeEngagement,
  SocialEntryReportReason.HarassmentHateAndThreats,
  SocialEntryReportReason.Privacy,
  SocialEntryReportReason.SexualAndGraphicContent,
  SocialEntryReportReason.IllegalAndDangerous,
  SocialEntryReportReason.ProfileText,
] as const;
