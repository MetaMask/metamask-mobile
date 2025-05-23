import React, { useCallback } from 'react';
import Text from '../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import Row from '../../../Ramp/components/Row';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

export const createEnterEmailNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ENTER_EMAIL,
);

const BuildQuote = () => {
  const navigation = useNavigation();

  const handleOnPressContinue = useCallback(() => {
    navigation.navigate(...createEnterEmailNavDetails());
  }, [navigation]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            Build Quote Page Placeholder
          </Text>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row>
            <StyledButton
              type="confirm"
              onPress={handleOnPressContinue}
              accessibilityRole="button"
              accessible
            >
              Continue
            </StyledButton>
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BuildQuote;
