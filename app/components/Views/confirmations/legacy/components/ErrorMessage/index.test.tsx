import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorMessage from '.';
import { CommonSelectorsIDs } from '../../../../../util/Common.testIds';

describe('ErrorMessage', () => {
  it('should render correctly', () => {
    const { getByTestId } = render(<ErrorMessage errorMessage={'error'} />);
    expect(getByTestId(CommonSelectorsIDs.ERROR_MESSAGE)).toBeOnTheScreen();
  });
});
