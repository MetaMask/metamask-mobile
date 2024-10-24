import React from 'react';
import BaseNotification from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const mockedOnHide = jest.fn();
const mockedOnPress = jest.fn();

describe('BaseNotification', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <BaseNotification
        status="pending"
        data={{
          description: 'Testing description', title: 'Testing Title'
        }}
        onPress={mockedOnPress}
        onHide={mockedOnHide}
        autoDismiss
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
