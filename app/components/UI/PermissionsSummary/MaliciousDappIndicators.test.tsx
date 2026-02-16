import React from 'react';
import { render } from '@testing-library/react-native';
import {
  MaliciousDappUrlIcon,
  DangerConnectButtonContent,
} from './MaliciousDappIndicators';

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { inverse: '#FFFFFF' },
    },
  }),
}));

describe('MaliciousDappIndicators', () => {
  describe('MaliciousDappUrlIcon', () => {
    it('renders a Danger icon', () => {
      const { toJSON } = render(<MaliciousDappUrlIcon />);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Danger');
    });
  });

  describe('DangerConnectButtonContent', () => {
    it('renders the Connect label', () => {
      const { getByText } = render(<DangerConnectButtonContent />);
      expect(getByText('Connect')).toBeDefined();
    });

    it('renders a Danger icon alongside the label', () => {
      const { toJSON } = render(<DangerConnectButtonContent />);
      const tree = JSON.stringify(toJSON());
      expect(tree).toContain('Danger');
      expect(tree).toContain('Connect');
    });

    it('renders with a row layout', () => {
      const { toJSON } = render(<DangerConnectButtonContent />);
      const root = toJSON();
      expect(root?.props?.style?.flexDirection).toBe('row');
    });
  });
});
