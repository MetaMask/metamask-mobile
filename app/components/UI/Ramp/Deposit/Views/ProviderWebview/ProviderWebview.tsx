import React from 'react';
import Text from '../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Row from '../../../Aggregator/components/Row';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';

export const createProviderWebviewNavDetails = createNavigationDetails(
  Routes.DEPOSIT.PROVIDER_WEBVIEW,
);

const ProviderWebview = () => (
  <ScreenLayout>
    <ScreenLayout.Body>
      <ScreenLayout.Content>
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Text style={{ textAlign: 'center', marginTop: 40 }}>
          Provider Webview Page Placeholder
        </Text>
      </ScreenLayout.Content>
    </ScreenLayout.Body>
    <ScreenLayout.Footer>
      <ScreenLayout.Content>
        <Row>
          <StyledButton type="confirm" accessibilityRole="button" accessible>
            Continue
          </StyledButton>
        </Row>
      </ScreenLayout.Content>
    </ScreenLayout.Footer>
  </ScreenLayout>
);

export default ProviderWebview;
