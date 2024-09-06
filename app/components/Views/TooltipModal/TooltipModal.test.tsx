import React from 'react';
import TooltipModal from './';
import { TooltipModalProps } from './ToolTipModal.types';
import { shallow } from 'enzyme';

const MOCK_ROUTE_DATA: TooltipModalProps = {
  route: {
    params: {
      title: 'Test Tooltip',
      tooltip: 'This is a test tooltip',
    },
  },
};

describe('Tooltip Modal', () => {
  it('should render correctly', () => {
    const modal = shallow(<TooltipModal {...MOCK_ROUTE_DATA} />);
    expect(modal).toMatchSnapshot();
  });
});
