import React from 'react';
import { shallow } from 'enzyme';
import Main from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ShallowWrapper } from 'enzyme';

// Mock the trackEvent function
jest.mock('../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    CONNECTION_DROPPED: 'CONNECTION_DROPPED',
  },
  trackEvent: jest.fn(),
}));

const mockStore = configureMockStore();
const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

describe('Main component', () => {
  let wrapper: ShallowWrapper<any, any, any>;
  let instance: any;

  beforeEach(() => {
    jest.useFakeTimers();
    wrapper = shallow(
      <Provider store={store}>
        <Main />
      </Provider>,
    )
      .dive()
      .dive();
    instance = wrapper.instance();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    expect(wrapper).toMatchSnapshot();
  });

  describe('connectionChangeHandler', () => {
    it('should not do anything if state is falsy', () => {
      instance.connectionChangeHandler(null);
      expect(instance.state.connected).toBeUndefined();
    });

    it('should set connected state to true when isConnected is true', () => {
      instance.connectionChangeHandler({ isConnected: true });
      expect(instance.state.connected).toBe(true);
    });

    it('should set connected state to false when isConnected is false', () => {
      instance.connectionChangeHandler({ isConnected: false });
      expect(instance.state.connected).toBe(false);
    });

    it('should navigate to OfflineModeView after 3 seconds of being offline', () => {
      const mockNavigation = { navigate: jest.fn() };
      wrapper.setProps({ navigation: mockNavigation });

      instance.setState({ connected: true });
      instance.connectionChangeHandler({ isConnected: false });

      jest.advanceTimersByTime(2999);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('OfflineModeView');
    });

    it('should not navigate to OfflineModeView if connection is restored within 3 seconds', () => {
      const mockNavigation = { navigate: jest.fn() };
      wrapper.setProps({ navigation: mockNavigation });

      instance.setState({ connected: true });
      instance.connectionChangeHandler({ isConnected: false });

      jest.advanceTimersByTime(2000);
      instance.connectionChangeHandler({ isConnected: true });

      jest.advanceTimersByTime(1000);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should track CONNECTION_DROPPED event on error', () => {
      const mockError = new Error('Test error');
      console.error = jest.fn();

      instance.connectionChangeHandler = jest.fn().mockImplementation(() => {
        throw mockError;
      });

      instance.connectionChangeHandler({ isConnected: false });

      expect(console.error).toHaveBeenCalledWith(
        'User dropped connection',
        mockError,
      );
      expect(trackEvent).toHaveBeenCalledWith(
        MetaMetricsEvents.CONNECTION_DROPPED,
      );
    });
  });
});
