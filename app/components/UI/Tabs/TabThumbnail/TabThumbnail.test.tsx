import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import TabThumbnail from './TabThumbnail';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import mockedEngine from '../../../../core/__mocks__/MockedEngine';

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

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
