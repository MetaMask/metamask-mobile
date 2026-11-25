import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KycRejected, { KycRejectedSelectorsIDs } from './KycRejected';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';

jest.mock('../../hooks/useTrackKycResultViewed');

const mockGoBack = jest.fn();
const mockOnAction = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('KycRejected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAction.mockResolvedValue(undefined);
  });

  it('navigates back from the header', () => {
    const { getByTestId } = renderWithProvider(
      <KycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    fireEvent.press(getByTestId(KycRejectedSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('reports the rejected result as viewed', () => {
    renderWithProvider(
      <KycRejected action="contactSupport" onAction={mockOnAction} />,
    );

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('rejected');
  });
});
