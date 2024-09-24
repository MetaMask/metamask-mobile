import React from 'react';
import { shallow, mount } from 'enzyme';
import OnboardingCarousel, {
  OnboardingCarousel as OnboardingCarouselComponent,
} from './';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { ThemeContext, mockTheme } from '../../../util/theme';
import StorageWrapper from '../../../store/storage-wrapper';

const mockStore = createMockStore();
const initialState = { currentTab: 1, appStartTime: '12345' };
const store = mockStore(initialState);

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding', () =>
  jest.fn(),
);
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

describe('OnboardingCarousel', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <OnboardingCarouselComponent />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  // it.only('should render the Text component when isTest is true', async () => {
  //   const wrapper = shallow(
  //     <Provider store={store}>
  //       <OnboardingCarouselComponent />
  //     </Provider>,
  //   )
  //     .find(OnboardingCarouselComponent)
  //     .dive();
  //   console.log('WRAPPER ======== ', wrapper);
  //   const instance = wrapper.instance();
  //   console.log('instance ======== ', instance);

  //   //test breaks when setting State

  //   wrapper.setState({ appStartTime: '12345' });

  //   console.log('After setting state ======== ', instance);

  //   const textComponent = wrapper.findWhere(
  //     (node) =>
  //       node.prop('testID') ===
  //       PerformanceRegressionSelectorIDs.APP_START_TIME_ID,
  //   );

  //   expect(textComponent.exists()).toBe(true);
  // });
});
