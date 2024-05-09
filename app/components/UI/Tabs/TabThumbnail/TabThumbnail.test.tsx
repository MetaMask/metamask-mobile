import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import TabThumbnail from './TabThumbnail';

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('TabThumbnail', () => {
  it('should render correctly', () => {
    const foo = () => null;
    const { toJSON } = renderWithProvider(
      // eslint-disable-next-line react/jsx-no-bind
      <TabThumbnail
        tab={{ url: 'about:blank', image: '', id: 123 }}
        isActiveTab
        onClose={foo}
        onSwitch={foo}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
