import React from 'react';
import { render } from '@testing-library/react-native';
import ExpandedMessage from '.';

const renderMessageMock = jest.fn();
const toggleExpandedMessageMock = jest.fn();

describe('ExpandedMessage', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ExpandedMessage
        currentPageInformation={{ title: 'title', url: 'url' }}
        renderMessage={renderMessageMock}
        toggleExpandedMessageMock={toggleExpandedMessageMock}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
