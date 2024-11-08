import React from 'react';
import { SafeAreaView } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import ReusableModal from './';
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

describe('ReusableModal', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
    });
  });

  it('should render correctly', () => {
    render(
      <SafeAreaView>
        <ReusableModal>{null}</ReusableModal>
      </SafeAreaView>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
