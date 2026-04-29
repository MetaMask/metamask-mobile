import React from 'react';
import { render } from '@testing-library/react-native';
import Confetti from './';

jest.mock('react-native-confetti');
jest.mock('react-native-confetti-cannon');

describe('Confetti', () => {
  it('should render correctly', () => {
    expect(() => render(<Confetti />)).not.toThrow();
  });
});
