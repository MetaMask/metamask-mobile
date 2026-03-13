import React from 'react';
import { render } from '@testing-library/react-native';
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
  return render(
    <Provider store={store}>
      <ErrorStep
        onReject={onRejectMock}
        onRetry={onRetryMock}
        title={title}
        subTitle={subTitle}
        showViewSettings={showViewSettings}
      />
    </Provider>,
  );
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
      const { toJSON } = createWrapper({ store });
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const { toJSON } = createWrapper({ showViewSettings: false, store });
      expect(toJSON()).toMatchSnapshot();
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
      const { toJSON } = createWrapper({ store });
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const { toJSON } = createWrapper({ showViewSettings: false, store });
      expect(toJSON()).toMatchSnapshot();
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
      const { toJSON } = createWrapper({ store });
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const { toJSON } = createWrapper({ showViewSettings: false, store });
      expect(toJSON()).toMatchSnapshot();
    });

    jest.resetAllMocks();
  });
});
