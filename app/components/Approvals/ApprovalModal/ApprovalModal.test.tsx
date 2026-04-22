import React from 'react';
import { render } from '@testing-library/react-native';
import ApprovalModal from './ApprovalModal';

describe('ApprovalModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    const { toJSON } = render(
      <ApprovalModal isVisible onCancel={() => undefined}>
        <div>test</div>
      </ApprovalModal>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
