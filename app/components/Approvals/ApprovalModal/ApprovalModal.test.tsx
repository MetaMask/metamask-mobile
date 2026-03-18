import React from 'react';
import { render } from '@testing-library/react-native';
import ApprovalModal from './ApprovalModal';

describe('ApprovalModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const component = render(
      <ApprovalModal isVisible onCancel={() => undefined}>
        <div>test</div>
      </ApprovalModal>,
    );
    expect(component).toMatchSnapshot();
  });
});
