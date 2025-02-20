import React from 'react';
import { render } from '@testing-library/react-native';
import ApprovalModal from './ApprovalModal';
import Text from '../../../component-library/components/Texts/Text';

describe('ApprovalModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    const { toJSON } = render(
      <ApprovalModal isVisible onCancel={() => undefined}>
        <Text>test</Text>
      </ApprovalModal>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
