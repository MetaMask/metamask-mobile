import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';

import NotificationRoot from './Root';
import { ACTIONS, PREFIXES } from '../../../../constants/deeplinks';

const children = <></>;
const styles = {
  wrapper: {},
  trashIconContainer: {},
};
const onDismiss = jest.fn();
const handleOnPress = jest.fn();

describe('NotificationRoot', () => {


  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationRoot handleOnPress={handleOnPress} onDismiss={onDismiss} styles={styles} children={children}/>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

});
