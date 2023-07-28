import React from 'react';
import { shallow } from 'enzyme';
import ApprovalModal from './ApprovalModal';

describe('ApprovalModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(
      <ApprovalModal isVisible onCancel={() => undefined}>
        <div>test</div>
      </ApprovalModal>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
