import React from 'react';
import { act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Tabs from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { EdgeInsets } from 'react-native-safe-area-context';

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
  const inset: EdgeInsets = { top: 1, right: 2, bottom: 3, left: 4 };
  return {
    SafeAreaInsetsContext: {
      Consumer: jest.fn().mockImplementation(({ children }: { children: (insets: EdgeInsets) => React.ReactNode }) => children(inset)),
    },
  };
});

describe('Tabs', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(
      <Tabs
        tabs={[{ id: 1, url: 'about:blank', image: '' }]}
        activeTab={1}
        newTab={() => {}}
        closeTab={() => {}}
        closeAllTabs={() => {}}
        closeTabsView={() => {}}
        switchToTab={() => {}}
        animateCurrentTab={() => {}}
        trackEvent={() => {}}
      />,
      { state: mockInitialState },
    );

    expect(component.toJSON()).toMatchSnapshot();
  });
});