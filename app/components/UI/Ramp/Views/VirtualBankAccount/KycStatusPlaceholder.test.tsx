import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import backgroundState from '../../../../../util/test/initial-background-state.json';
import KycStatusPlaceholder from './KycStatusPlaceholder';
import { KycStatusPlaceholderSelectorsIDs } from './KycStatusPlaceholder.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const renderPlaceholder = (
  kycOverrides: Partial<(typeof backgroundState)['KycController']> = {},
) =>
  renderWithProvider(<KycStatusPlaceholder />, {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          KycController: {
            ...backgroundState.KycController,
            ...kycOverrides,
          },
        },
      },
    },
  });

describe('KycStatusPlaceholder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders KycController session status fields', () => {
    const { getByTestId } = renderPlaceholder({
      sessionId: 'session-1',
      sessionStatus: {
        finalStatus: 'pending',
        statusMessage: 'need_more_info',
        externalUserId: 'user-1',
        kycStatus: 'pending',
        vendor: 'iron',
        vendorStatus: 'pending',
        sessionId: 'session-1',
      },
    });

    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.SESSION_STATUS),
    ).toHaveTextContent('pending');
    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.SESSION_ID),
    ).toHaveTextContent('session-1');
    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.SESSION_STATUS_MESSAGE),
    ).toHaveTextContent('need_more_info');
  });

  it('renders null placeholders when KycController status fields are empty', () => {
    const { getByTestId } = renderPlaceholder();

    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.SESSION_STATUS),
    ).toHaveTextContent('null');
    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.SESSION_ID),
    ).toHaveTextContent('null');
    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.SESSION_STATUS_MESSAGE),
    ).toHaveTextContent('null');
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderPlaceholder();

    fireEvent.press(getByTestId(KycStatusPlaceholderSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
