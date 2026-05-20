import { renderHook } from '@testing-library/react-native';
import { usePushPrePromptAnalytics } from './usePushPrePromptAnalytics';

describe('usePushPrePromptAnalytics', () => {
  it('exposes noop analytics callbacks', async () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    expect(() => {
      result.current.trackPrePromptViewed('push_permission');
      result.current.trackPrePromptDismissed('marketing_consent');
      result.current.trackPrePromptButtonClicked(
        'marketing_consent',
        'confirm',
      );
      result.current.trackOsPromptShown('push_permission');
      result.current.trackOsPromptResponse('push_permission', 'allowed');
    }).not.toThrow();

    await expect(
      result.current.identifyMarketingConsent(true),
    ).resolves.toBeUndefined();
  });
});
