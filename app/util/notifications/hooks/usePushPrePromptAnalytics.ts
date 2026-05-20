import { PushPrePromptVariant } from './usePushPrePromptVariant';

type PushPrePromptAnalyticsVariant = Exclude<PushPrePromptVariant, null>;
type PushPrePromptButton = 'yes' | 'not_now' | 'confirm';
type PushOsPromptResponse = 'allowed' | 'denied';

interface PushPrePromptAnalytics {
  trackPrePromptViewed: (variant: PushPrePromptAnalyticsVariant) => void;
  trackPrePromptDismissed: (variant: PushPrePromptAnalyticsVariant) => void;
  trackPrePromptButtonClicked: (
    variant: PushPrePromptAnalyticsVariant,
    button: PushPrePromptButton,
  ) => void;
  trackOsPromptShown: (variant: PushPrePromptAnalyticsVariant) => void;
  trackOsPromptResponse: (
    variant: PushPrePromptAnalyticsVariant,
    response: PushOsPromptResponse,
  ) => void;
  identifyMarketingConsent: (enabled: boolean) => Promise<void>;
}

const noop = () => undefined;
const noopAsync = () => Promise.resolve();

const pushPrePromptAnalyticsNoops: PushPrePromptAnalytics = {
  trackPrePromptViewed: noop,
  trackPrePromptDismissed: noop,
  trackPrePromptButtonClicked: noop,
  trackOsPromptShown: noop,
  trackOsPromptResponse: noop,
  identifyMarketingConsent: noopAsync,
};

export function usePushPrePromptAnalytics() {
  return pushPrePromptAnalyticsNoops;
}
