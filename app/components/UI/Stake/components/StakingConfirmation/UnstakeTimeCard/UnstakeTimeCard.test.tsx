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

    const upToDaysCopy = `${strings('stake.up_to_n', { count: 11 })}`;
    const daysCopy = `${strings('stake.day', { count: 11 })}`;

    expect(
      getByText(strings('tooltip_modal.unstaking_time.title')),
    ).toBeDefined();
    expect(getByText(`${upToDaysCopy} ${daysCopy}`)).toBeDefined(); // Up to 11 days

    expect(toJSON()).toMatchSnapshot();
  });
});
