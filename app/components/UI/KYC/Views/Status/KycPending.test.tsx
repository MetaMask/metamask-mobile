import React from 'react';
import { render } from '@testing-library/react-native';
import KycPending from './KycPending';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';

jest.mock('../../hooks/useTrackKycResultViewed');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));
// The scanner Rive needs a navigator for its replay-on-focus; this test has none.
jest.mock(
  '../../../Money/components/MoneyVbaHomeCard/MoneyVbaHomeCardHeroAnimation',
  () => () => null,
);

describe('KycPending', () => {
  it('reports the pending result as viewed', () => {
    render(<KycPending onLeave={jest.fn()} />);

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('pending');
  });
});
