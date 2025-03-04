import React from 'react';
import { render } from '@testing-library/react-native';
import { getNavbar } from './Navbar';

describe('getStakingDepositNavbar', () => {
  it('renders the header title correctly', () => {
    const title = 'Test Title';
    const { getByText } = render(
      <>
        {getNavbar({ title, onReject: jest.fn() }).headerTitle()}
      </>,
    );

    expect(getByText(title)).toBeTruthy();
  });

  it('calls onReject when the back button is pressed', () => {
    const onRejectMock = jest.fn();
    const { getByTestId } = render(
      <>
        {getNavbar({
          title: 'Test Title',
          onReject: onRejectMock,
        }).headerLeft()}
      </>,
    );

    const backButton = getByTestId('Test Title-navbar-back-button');
    backButton.props.onPress();

    expect(onRejectMock).toHaveBeenCalled();
  });
});
