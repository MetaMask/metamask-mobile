import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Tabs from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import Routes from '../../../constants/navigation/Routes';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';

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

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  return {
    SafeAreaInsetsContext: {
      Consumer: jest.fn().mockImplementation(({ children }) => children(inset)),
    },
  };
});

describe('Tabs', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Tabs tabs={[{ id: 1, url: 'about:blank', image: '' }]} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should navigate to MAX_BROWSER_TABS_MODAL when trying to add a 6th tab', () => {
    const mockNavigate = jest.fn();
    const { getByTestId } = renderWithProvider(
      <Tabs
        tabs={[
          { id: 1, url: 'about:blank', image: '' },
          { id: 2, url: 'about:blank', image: '' },
          { id: 3, url: 'about:blank', image: '' },
          { id: 4, url: 'about:blank', image: '' },
          { id: 5, url: 'about:blank', image: '' },
        ]}
        navigation={{ navigate: mockNavigate }}
      />,
      { state: mockInitialState },
    );

    const addButton = getByTestId(BrowserViewSelectorsIDs.ADD_NEW_TAB);
    addButton.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.MAX_BROWSER_TABS_MODAL, {
      screen: Routes.MODAL.MAX_BROWSER_TABS_MODAL,
    });
  });
});
