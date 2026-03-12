import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  AnalyticsEventBuilder,
  chainableBuilder,
} from '../../../util/analytics/AnalyticsEventBuilder';
import NavbarTitle from './';

const mockStore = configureMockStore();
const store = mockStore({});

const mockAnalyticsTrackEvent = jest.fn();
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args) => mockAnalyticsTrackEvent(...args),
  },
}));

jest.mock('../../../util/analytics/AnalyticsEventBuilder', () => {
  const chainableBuilder = {
    addProperties: jest.fn(function () {
      return this;
    }),
    addSensitiveProperties: jest.fn(function () {
      return this;
    }),
    removeProperties: jest.fn(function () {
      return this;
    }),
    removeSensitiveProperties: jest.fn(function () {
      return this;
    }),
    setSaveDataRecording: jest.fn(function () {
      return this;
    }),
    build: jest.fn(() => ({ builtEvent: true })),
  };
  const createEventBuilder = jest.fn(() => chainableBuilder);
  return {
    __esModule: true,
    default: { createEventBuilder },
    AnalyticsEventBuilder: { createEventBuilder },
    chainableBuilder,
  };
});

jest.mock('../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    NETWORK_SELECTOR_PRESSED: 'NETWORK_SELECTOR_PRESSED',
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/compat', () => ({
  withNavigation: (Component) => {
    const WithNav = (props) => (
      <Component {...props} navigation={{ navigate: mockNavigate }} />
    );
    WithNav.displayName = `withNavigation(${Component.displayName || Component.name || 'Component'})`;
    return WithNav;
  },
}));

describe('NavbarTitle', () => {
  it('should render correctly', () => {
    const title = 'Test';
    const wrapper = shallow(
      <Provider store={store}>
        <NavbarTitle title={title} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('tracks NETWORK_SELECTOR_PRESSED when pressed and network is not disabled', () => {
    jest.clearAllMocks();

    const { getByText } = renderWithProvider(
      <NavbarTitle title="Settings" translate={false} />,
      {
        state: {
          engine: { backgroundState },
        },
      },
    );

    fireEvent.press(getByText('Settings'));

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      'NETWORK_SELECTOR_PRESSED',
    );
    expect(chainableBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({ chain_id: expect.anything() }),
    );
    expect(mockAnalyticsTrackEvent).toHaveBeenCalled();
  });
});
