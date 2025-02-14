import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { useConfirmActions } from '../../../hooks/useConfirmActions';
import FlatNavHeader from './FlatNavHeader';

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

describe('FlatNavHeader', () => {
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: mockReject,
    } as unknown as ReturnType<typeof useConfirmActions>);
  });

  it('renders the title correctly', () => {
    const { getByText } = render(<FlatNavHeader title="Title" />);
    expect(getByText('Title')).toBeTruthy();
  });

  it('calls onLeftPress when the button is pressed', () => {
    const onLeftPressMock = jest.fn();
    const { getByTestId } = render(
      <FlatNavHeader title="HeaderText" onLeftPress={onLeftPressMock} />,
    );

    const button = getByTestId('flat-nav-header-back-button');
    fireEvent.press(button);

    expect(onLeftPressMock).toHaveBeenCalled();
  });

  it('calls onReject when the button is pressed and onLeftPress is not provided', () => {
    const { getByTestId } = render(<FlatNavHeader title="HeaderText" />);

    const button = getByTestId('flat-nav-header-back-button');
    fireEvent.press(button);

    expect(mockReject).toHaveBeenCalled();
  });
});
