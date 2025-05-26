import React, { useCallback, useEffect } from 'react';
import Text from '../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import Row from '../../../Ramp/components/Row';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../Navbar';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BasicInfo.styles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

// TODO: move this to Enter address view when it created
export const createEnterAddressNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ENTER_ADDRESS,
);

export const createBasicInfoNavDetails = createNavigationDetails(
  Routes.DEPOSIT.BASIC_INFO,
);

const BasicInfo = () => {
  const navigation = useNavigation();
  const { theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.basic_info.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(() => {
    navigation.navigate(...createEnterAddressNavDetails());
  }, [navigation]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            Basic Info form placeholder
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

export default BasicInfo;
