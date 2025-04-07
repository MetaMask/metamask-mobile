import React from 'react';
import { render } from '@testing-library/react-native';
import { getNavbar } from './Navbar';
import { Theme } from '../../../../../../util/theme/models';

describe('getStakingDepositNavbar', () => {
  it('renders the header title correctly', () => {
    const title = 'Test Title';
    const { getByText } = render(
      <>
        {getNavbar({
          onReject: jest.fn(),
          theme: {
            colors: {
              background: {
                alternative: 'red',
              },
            },
          } as Theme,
          title,
        }).headerTitle()}
      </>,
    );

    expect(getByText(title)).toBeTruthy();
  });

  it('calls onReject when the back button is pressed', () => {
    const onRejectMock = jest.fn();
    const { getByTestId } = render(
      <>
        {getNavbar({
          onReject: onRejectMock,
          theme: {
            colors: {
              background: {
                alternative: 'red',
              },
            },
          } as Theme,
          title: 'Test Title',
        }).headerLeft()}
      </>,
    );

    const backButton = getByTestId('Test Title-navbar-back-button');
    backButton.props.onPress();

    expect(onRejectMock).toHaveBeenCalled();
  });
});
