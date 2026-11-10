import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { createMockToken } from '../../../testUtils';
import { SecurityDataType, type SecurityData } from '../../../types';
import { TokenWarningModalMode } from '../../TokenWarningModal/constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { TokenWarningBanner } from './TokenWarningBanner';
import { createBannerState, renderBanner } from './testUtils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const renderWithSecurityData = (securityData: SecurityData) =>
  renderBanner(<TokenWarningBanner />, {
    state: createBannerState({
      destToken: createMockToken({
        address: '0xdest',
        symbol: 'USDC',
        securityData,
      }),
    }),
  });

const renderWithSecurityType = (type: SecurityDataType) =>
  renderWithSecurityData({ type, metadata: { features: [] } });

describe('TokenWarningBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('warns about a suspicious destination token', () => {
    const { getByText } = renderWithSecurityType(SecurityDataType.Warning);

    expect(
      getByText(
        strings('bridge.token_warning_suspicious_banner', { token: 'USDC' }),
      ),
    ).toBeOnTheScreen();
  });

  it('warns about a malicious destination token', () => {
    const { getByText } = renderWithSecurityType(SecurityDataType.Malicious);

    expect(
      getByText(
        strings('bridge.token_warning_malicious_banner', { token: 'USDC' }),
      ),
    ).toBeOnTheScreen();
  });

  it('is not shown for a token without a negative security type', () => {
    const { queryByTestId } = renderWithSecurityType(SecurityDataType.Verified);

    expect(queryByTestId(SwapsBannersSelectorsIDs.TOKEN_WARNING)).toBeNull();
  });

  it('opens the token warning modal with the flagged features when pressed', () => {
    const features = [
      {
        featureId: 'honeypot',
        type: SecurityDataType.Warning,
        description: 'Cannot be sold',
      },
    ];
    const { getByTestId } = renderWithSecurityData({
      type: SecurityDataType.Warning,
      metadata: { features },
    });

    fireEvent.press(getByTestId(SwapsBannersSelectorsIDs.TOKEN_WARNING));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.TOKEN_WARNING_MODAL,
      params: expect.objectContaining({
        warningType: SecurityDataType.Warning,
        features,
        mode: TokenWarningModalMode.Info,
      }),
    });
  });

  it('opens the token warning modal without features when none were reported', () => {
    const { getByTestId } = renderWithSecurityData({
      type: SecurityDataType.Malicious,
    });

    fireEvent.press(getByTestId(SwapsBannersSelectorsIDs.TOKEN_WARNING));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.TOKEN_WARNING_MODAL,
      params: expect.objectContaining({ features: [] }),
    });
  });
});
