import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import Engine from '../../../../core/Engine';

export default function ChompApiTest() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const [loading, setLoading] = useState(false);

  const handleTestGetUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const { ChompApiService, AuthenticationController } = Engine.context;
      if (!ChompApiService) {
        Alert.alert('Error', 'ChompApiService is not initialised');
        return;
      }

      // Check auth state first
      const isSignedIn = AuthenticationController?.isSignedIn();
      let bearerToken: string | undefined;
      try {
        bearerToken = await AuthenticationController?.getBearerToken();
      } catch (e) {
        bearerToken = undefined;
      }

      const result = await ChompApiService.getUpgrade(
        '0x0000000000000000000000000000000000000000',
      );
      Alert.alert(
        'ChompApiService: getUpgrade',
        `Result: ${JSON.stringify(result, null, 2)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = (error as { status?: number })?.status;
      Alert.alert(
        `ChompApiService Error${status ? ` (${status})` : ''}`,
        message,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {'CHOMP API Service'}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {
          'Call getUpgrade with a zero address to verify the service is wired up and can reach the API.'
        }
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleTestGetUpgrade}
        isFullWidth
        style={styles.accessory}
        loading={loading}
      >
        {'Test getUpgrade'}
      </Button>
    </>
  );
}
