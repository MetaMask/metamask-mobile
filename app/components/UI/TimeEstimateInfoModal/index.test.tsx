import React from 'react';
import { render } from '@testing-library/react-native';
import TimeEstimateInfoModal from './';

describe('TimeEstimateInfoModal', () => {
  it('should render correctly', () => {
    const component = render(
      <TimeEstimateInfoModal timeEstimateId={'medium'} />,
    );
    expect(component).toMatchSnapshot();
  });
});
