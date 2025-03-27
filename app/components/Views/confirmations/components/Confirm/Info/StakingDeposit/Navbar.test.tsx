import React from 'react';
import { render } from '@testing-library/react-native';
import { getStakingDepositNavbar } from './Navbar';

describe('getStakingDepositNavbar', () => {
  it('renders the header title correctly', () => {
    const title = 'Test Title';
    const { getByText } = render(
      <>
        {getStakingDepositNavbar({ title, onReject: jest.fn() }).headerTitle()}
      </>,
    );

    expect(getByText(title)).toBeTruthy();
  });

  it('calls onReject when the back button is pressed', () => {
    const onRejectMock = jest.fn();
    const { getByTestId } = render(
      <>
        {getStakingDepositNavbar({
          title: 'Test Title',
          onReject: onRejectMock,
        }).headerLeft()}
      </>,
    );

    const backButton = getByTestId('staking-deposit-navbar-back-button');
    backButton.props.onPress();

    expect(onRejectMock).toHaveBeenCalled();
  });
});
