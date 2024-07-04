import React from 'react';
import { render } from '@testing-library/react-native';
import ExpandedMessage from '.';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

const renderMessageMock = jest.fn();
const toggleExpandedMessageMock = jest.fn();

describe('ExpandedMessage', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <ExpandedMessage
          currentPageInformation={{ title: 'title', url: 'url' }}
          renderMessage={renderMessageMock}
          toggleExpandedMessageMock={toggleExpandedMessageMock}
        />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
