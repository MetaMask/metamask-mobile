import React from 'react';
import { StyleSheet } from 'react-native';
import Empty from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

describe('Empty', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<Empty />);
    expect(getByText('Nothing to see here')).toBeOnTheScreen();
  });

  it('does not include the disabled notifications CTA offset', () => {
    const { getByTestId } = renderWithProvider(
      <Empty testID="empty-notifications" />,
    );

    const wrapperStyle = StyleSheet.flatten(
      getByTestId('empty-notifications').props.style,
    );

    expect(wrapperStyle.paddingBottom).toBeUndefined();
  });
});
