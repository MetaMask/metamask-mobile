import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getNavbar } from './navbar';

describe('getNavbar', () => {
  it('renders the header title correctly', () => {
    const title = 'Test Title';
    const { getByText } = render(
      <>{getNavbar({ title, onReject: jest.fn() }).header()}</>,
    );

    expect(getByText(title)).toBeTruthy();
  });

  it('calls onReject when the back button is pressed', () => {
    const onRejectMock = jest.fn();
    const { getByRole } = render(
      <>
        {getNavbar({
          title: 'Test Title',
          onReject: onRejectMock,
        }).header()}
      </>,
    );

    const backButton = getByRole('button');
    fireEvent.press(backButton);

    expect(onRejectMock).toHaveBeenCalled();
  });
});
