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

  it('renders KycController user status fields', () => {
    const { getByTestId } = renderPlaceholder({
      userStatus: 'pending',
      userStatusSumsubSessionId: 'sumsub-session-1',
      userStatusErrorCode: 'need_more_info',
    });

    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.USER_STATUS),
    ).toHaveTextContent('pending');
    expect(
      getByTestId(
        KycStatusPlaceholderSelectorsIDs.USER_STATUS_SUMSUB_SESSION_ID,
      ),
    ).toHaveTextContent('sumsub-session-1');
    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.USER_STATUS_ERROR_CODE),
    ).toHaveTextContent('need_more_info');
  });

  it('renders null placeholders when KycController status fields are empty', () => {
    const { getByTestId } = renderPlaceholder();

    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.USER_STATUS),
    ).toHaveTextContent('null');
    expect(
      getByTestId(
        KycStatusPlaceholderSelectorsIDs.USER_STATUS_SUMSUB_SESSION_ID,
      ),
    ).toHaveTextContent('null');
    expect(
      getByTestId(KycStatusPlaceholderSelectorsIDs.USER_STATUS_ERROR_CODE),
    ).toHaveTextContent('null');
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderPlaceholder();

    fireEvent.press(getByTestId(KycStatusPlaceholderSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
