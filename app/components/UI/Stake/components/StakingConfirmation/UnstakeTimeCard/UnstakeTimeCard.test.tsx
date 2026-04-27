import React from 'react';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { createMockUseAnalyticsHook } from '../../../../../../util/test/analyticsMock';
import UnstakingTimeCard from './UnstakeTimeCard';
import { strings } from '../../../../../../../locales/i18n';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});
jest.mock('../../../../../hooks/useAnalytics/useAnalytics');

describe('UnstakingTimeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
  });

  it('render matches snapshot', () => {
    const { toJSON, getByText } = renderWithProvider(<UnstakingTimeCard />);

    const estimatedUnstakingTime = strings('stake.estimated_unstaking_time');

    expect(
      getByText(strings('tooltip_modal.unstaking_time.title')),
    ).toBeDefined();
    expect(getByText(estimatedUnstakingTime)).toBeDefined(); // 1 to 44 days

    expect(toJSON()).toMatchSnapshot();
  });
});
