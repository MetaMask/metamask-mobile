import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
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

describe('UnstakingTimeCard', () => {
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
