import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { InviteTermsLink } from './InviteTermsLink';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: (): { navigate: jest.Mock } => ({
    navigate: mockNavigate,
  }),
}));

const link = {
  label: 'Learn more',
  url: 'https://link.metamask.io/rewards/terms',
};

describe('InviteTermsLink', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('opens the terms URL in the in-app browser', () => {
    const { getByTestId } = render(
      <InviteTermsLink link={link} testID="terms-link" />,
    );

    fireEvent.press(getByTestId('terms-link'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: link.url,
        timestamp: expect.any(Number),
      },
    });
  });

  it('does not open the browser while disabled', () => {
    const { getByTestId } = render(
      <InviteTermsLink link={link} testID="terms-link" disabled />,
    );

    expect(getByTestId('terms-link').props.onPress).toBeUndefined();
    expect(getByTestId('terms-link').props.accessibilityState).toEqual({
      disabled: true,
    });

    fireEvent.press(getByTestId('terms-link'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders nothing when the link is absent', () => {
    const { queryByTestId } = render(
      <InviteTermsLink link={null} testID="terms-link" />,
    );

    expect(queryByTestId('terms-link')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
