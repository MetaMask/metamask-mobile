import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { AppThemeKey } from '../../../../util/theme/models';
import { ThemeContext, mockTheme } from '../../../../util/theme';
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
      <ThemeContext.Provider value={mockTheme}>
        <ErrorStep
          onReject={onRejectMock}
          onRetry={onRetryMock}
          title={title}
          subTitle={subTitle}
          showViewSettings={showViewSettings}
        />
      </ThemeContext.Provider>
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
      const component = createWrapper({ store });
      expect(component).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const component = createWrapper({ showViewSettings: false, store });
      expect(component).toMatchSnapshot();
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
      const component = createWrapper({ store });
      expect(component).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const component = createWrapper({ showViewSettings: false, store });
      expect(component).toMatchSnapshot();
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
      const component = createWrapper({ store });
      expect(component).toMatchSnapshot();
    });

    it('renders correctly when showViewSettings false', () => {
      const component = createWrapper({ showViewSettings: false, store });
      expect(component).toMatchSnapshot();
    });

    jest.resetAllMocks();
  });
});
