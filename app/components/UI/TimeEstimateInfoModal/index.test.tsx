import React from 'react';
import { render } from '@testing-library/react-native';
import TimeEstimateInfoModal from './';

describe('TimeEstimateInfoModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <TimeEstimateInfoModal timeEstimateId={'medium'} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
