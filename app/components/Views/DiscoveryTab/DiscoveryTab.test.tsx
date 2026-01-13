import React from 'react';
import DiscoveryTab from './DiscoveryTab';
import renderWithProvider from '../../../util/test/renderWithProvider';

const mockNavigation = {
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../TokenDiscovery', () => ({
  TokenDiscovery: () => null,
}));

describe('DiscoveryTab', () => {
  const mockShowTabs = jest.fn();
  const mockUpdateTabInfo = jest.fn();

  const defaultProps = {
    id: 1,
    showTabs: mockShowTabs,
    updateTabInfo: mockUpdateTabInfo,
  };

  const initialState = {
    browser: {
      activeTab: 1,
      tabs: [{ id: 1, url: '' }],
    },
    engine: {
      backgroundState: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders DiscoveryTab component when tab is active', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('hides content when tab is not active', () => {
      const inactiveState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          activeTab: 2,
        },
      };

      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: inactiveState },
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('Props Handling', () => {
    it('accepts showTabs prop', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toBeTruthy();
    });

    it('accepts updateTabInfo prop', () => {
      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: initialState },
      );

      expect(toJSON()).toBeTruthy();
    });

    it('renders with all required props', () => {
      const requiredProps = {
        id: 1,
        showTabs: mockShowTabs,
        updateTabInfo: mockUpdateTabInfo,
      };

      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...requiredProps} />,
        { state: initialState },
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('renders when tab ID does not match active tab', () => {
      const differentTabState = {
        ...initialState,
        browser: {
          ...initialState.browser,
          activeTab: 99,
        },
      };

      const { toJSON } = renderWithProvider(
        <DiscoveryTab {...defaultProps} />,
        { state: differentTabState },
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
