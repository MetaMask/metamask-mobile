import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import ExpirationRow from './index';
import { ExpirationRowSelectorsIDs } from './testIds';

const defaultProps = {
  value: '1 hour',
  onPress: jest.fn(),
};

describe('ExpirationRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the expiration value', () => {
    const { getByTestId } = render(<ExpirationRow {...defaultProps} />);

    expect(getByTestId(ExpirationRowSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(ExpirationRowSelectorsIDs.VALUE)).toHaveTextContent(
      '1 hour',
    );
  });

  it('renders the expires label', () => {
    const { getByText } = render(<ExpirationRow {...defaultProps} />);

    expect(getByText(strings('bridge.limit.expires'))).toBeOnTheScreen();
  });

  it('calls onPress when the value is pressed', () => {
    const { getByTestId } = render(<ExpirationRow {...defaultProps} />);

    fireEvent.press(getByTestId(ExpirationRowSelectorsIDs.CONTAINER));

    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <ExpirationRow {...defaultProps} testID="custom-expiration-row" />,
    );

    expect(getByTestId('custom-expiration-row')).toBeOnTheScreen();
    expect(queryByTestId(ExpirationRowSelectorsIDs.CONTAINER)).toBeNull();
  });
});
