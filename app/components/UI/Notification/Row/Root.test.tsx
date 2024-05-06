import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationRoot from './Root';

const children = <></>;
const styles = {
  wrapper: {},
  trashIconContainer: {},
};
const onDismiss = jest.fn();
const handleOnPress = jest.fn();

describe('NotificationRoot', () => {
  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <NotificationRoot
        handleOnPress={handleOnPress}
        onDismiss={onDismiss}
        styles={styles}
        children={children}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
