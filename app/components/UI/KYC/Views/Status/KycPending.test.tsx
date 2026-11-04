import React from 'react';
import { render } from '@testing-library/react-native';
import VbaKycPending from './KycPending';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';

jest.mock('../../hooks/useTrackKycResultViewed');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), canGoBack: () => true }),
}));

describe('VbaKycPending', () => {
  it('reports the pending result as viewed', () => {
    render(<VbaKycPending />);

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('pending');
  });
});
