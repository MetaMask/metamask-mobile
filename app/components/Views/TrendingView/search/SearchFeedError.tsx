import React, { useCallback } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { EarnSearchFeedError } from '../feeds/earn/earnSearchTypes';

interface SearchFeedErrorProps {
  error: EarnSearchFeedError;
  feedId: string;
}

const SearchFeedError = ({ error, feedId }: SearchFeedErrorProps) => {
  const { message, retry, isRetrying } = error;

  const handleRetry = useCallback(async () => {
    await retry();
  }, [retry]);

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Warning}
      description={message}
      actionButtonLabel={strings('earn_module.retry')}
      actionButtonOnPress={handleRetry}
      actionButtonProps={{
        isDisabled: isRetrying,
        isLoading: isRetrying,
        testID: `search-feed-${feedId}-error-retry`,
      }}
      testID={`search-feed-${feedId}-error`}
      accessibilityLabel={`${message}. ${strings('earn_module.retry')}`}
    />
  );
};

export default SearchFeedError;
