import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import ClipboardManager from '../../../../core/ClipboardManager';
import useSubscriptions from '../../../hooks/useSubscriptions';
import { selectSubscriptionControllerState } from '../../../../selectors/subscriptionController';
import styleSheet from './DeveloperOptions.styles';

export const SUBSCRIPTION_DEV_TEST_IDS = {
  REFRESH_BUTTON: 'subscription-dev-refresh-button',
  TOGGLE_JSON_BUTTON: 'subscription-dev-toggle-json-button',
  COPY_JSON_BUTTON: 'subscription-dev-copy-json-button',
  JSON: 'subscription-dev-json',
};

const SubscriptionDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const [isJsonVisible, setIsJsonVisible] = useState(false);

  const { data, error, isFetching, isEnabled, refetch, dataUpdatedAt } =
    useSubscriptions({
      enabled: true,
      refetchInterval: false,
    });
  const customerId = useSelector(selectSubscriptionControllerState)?.customerId;
  const json = JSON.stringify(data ?? [], null, 2);

  let status: string;
  if (isFetching) {
    status = 'Fetching...';
  } else if (error) {
    status = `Error: ${error.message}`;
  } else if (!data) {
    status = 'Not signed in / locked';
  } else {
    status = `Last fetched: ${new Date(dataUpdatedAt).toLocaleString()}`;
  }

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleCopyJson = useCallback(async () => {
    await ClipboardManager.setString(json);
  }, [json]);

  return (
    <Box>
      <Text variant={TextVariant.HeadingLg} style={styles.heading}>
        {'Subscriptions'}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {status}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {`Customer ID: ${customerId ?? 'N/A'}`}
      </Text>
      {data?.length ? (
        data.map((subscription) => (
          <Text
            key={subscription.id}
            color={TextColor.TextAlternative}
            variant={TextVariant.BodyMd}
            style={styles.desc}
          >
            {`${subscription.id} · ${subscription.status} · ${subscription.products
              .map((product) => product.name)
              .join(', ')}`}
          </Text>
        ))
      ) : (
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {'No subscriptions'}
        </Text>
      )}
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={handleRefresh}
        isDisabled={isFetching || !isEnabled}
        isFullWidth
        testID={SUBSCRIPTION_DEV_TEST_IDS.REFRESH_BUTTON}
      >
        {'Refresh from server'}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={() => setIsJsonVisible((visible) => !visible)}
        isFullWidth
        testID={SUBSCRIPTION_DEV_TEST_IDS.TOGGLE_JSON_BUTTON}
      >
        {isJsonVisible ? 'Hide JSON' : 'Show JSON'}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        style={styles.accessory}
        size={ButtonSize.Lg}
        onPress={handleCopyJson}
        isDisabled={!data}
        isFullWidth
        testID={SUBSCRIPTION_DEV_TEST_IDS.COPY_JSON_BUTTON}
      >
        {'Copy JSON'}
      </Button>
      {isJsonVisible && (
        <Text
          variant={TextVariant.BodySm}
          className="font-mono"
          style={styles.desc}
          selectable
          testID={SUBSCRIPTION_DEV_TEST_IDS.JSON}
        >
          {json}
        </Text>
      )}
    </Box>
  );
};

export default SubscriptionDeveloperOptionsSection;
