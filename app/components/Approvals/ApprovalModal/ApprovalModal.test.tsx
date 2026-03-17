import React from 'react';
import { render } from '@testing-library/react-native';
import ApprovalModal from './ApprovalModal';

jest.mock('react-native-modal', () => {
  const MockModal = ({
    isVisible,
    children,
  }: {
    isVisible?: boolean;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => {
    if (!isVisible) return null;
    return <>{children}</>;
  };
  MockModal.displayName = 'MockModal';
  return MockModal;
});

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
