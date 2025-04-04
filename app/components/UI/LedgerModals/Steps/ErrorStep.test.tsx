import { shallow } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { AppThemeKey } from '../../../../util/theme/models';
import ErrorStep from './ErrorStep';

const mockStore = configureMockStore();

function createWrapper({
  onRejectMock = jest.fn(),
  onRetryMock = jest.fn(),
  title = 'Error Title',
  subTitle = 'Error Subtitle',
  showViewSettings = true,
  store = mockStore(),
} = {}) {
  return shallow(
    <Provider store={store}>
      <ErrorStep
        onReject={onRejectMock}
        onRetry={onRetryMock}
        title={title}
        subTitle={subTitle}
        showViewSettings={showViewSettings}
      />
    </Provider>,
  ).find(ErrorStep);
}

describe('ErrorStep', () => {
  describe('AppTheme is light', () => {
    const initialState = {
      user: {
        AppTheme: AppThemeKey.light,
      },
    };

    const store = mockStore(initialState);

    it('renders correctly when showViewSettings is true', () => {
      const wrapper = createWrapper({ store });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const wrapper = createWrapper({ showViewSettings: false, store });
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('AppTheme is dark', () => {
    const initialState = {
      user: {
        AppTheme: AppThemeKey.dark,
      },
    };

    const store = mockStore(initialState);

    it('renders correctly when showViewSettings is true', () => {
      const wrapper = createWrapper({ store });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const wrapper = createWrapper({ showViewSettings: false, store });
      expect(wrapper).toMatchSnapshot();
    });

    jest.resetAllMocks();
  });

  describe('AppTheme is os', () => {
    const initialState = {
      user: {
        AppTheme: AppThemeKey.os,
      },
    };

    const store = mockStore(initialState);

    it('renders correctly when showViewSettings is true', () => {
      const wrapper = createWrapper({ store });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const wrapper = createWrapper({ showViewSettings: false, store });
      expect(wrapper).toMatchSnapshot();
    });

    jest.resetAllMocks();
  });
});
