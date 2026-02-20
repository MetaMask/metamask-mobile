import React from 'react';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import NavbarTitle from './';

const mockStore = configureMockStore();
const store = mockStore({});

const mockAnalyticsTrackEvent = jest.fn();
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args) => mockAnalyticsTrackEvent(...args),
  },
}));

const mockBuild = jest.fn(() => ({ builtEvent: true }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../util/analytics/AnalyticsEventBuilder');
AnalyticsEventBuilder.createEventBuilder = mockCreateEventBuilder;

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

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      'NETWORK_SELECTOR_PRESSED',
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ chain_id: expect.anything() }),
    );
    expect(mockAnalyticsTrackEvent).toHaveBeenCalled();
  });
});
