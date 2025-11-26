import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SiteRowItem, { type SiteData } from './SiteRowItem';

describe('SiteRowItem', () => {
  const mockOnPress = jest.fn();

  const createSite = (overrides: Partial<SiteData> = {}): SiteData => ({
    id: 'site-1',
    name: 'MetaMask',
    url: 'https://metamask.io',
    displayUrl: 'metamask.io',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders site name', () => {
      const site = createSite();

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(getByText('MetaMask')).toBeOnTheScreen();
    });

    it('renders display URL', () => {
      const site = createSite();

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(getByText('metamask.io')).toBeOnTheScreen();
    });

    it('renders site logo when logoUrl is provided', () => {
      const site = createSite({ logoUrl: 'https://example.com/logo.png' });

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      const image = getByTestId('site-logo-image');
      expect(image).toBeOnTheScreen();
      expect(image.props.source.uri).toBe('https://example.com/logo.png');
    });

    it('renders fallback global icon when logoUrl is not provided', () => {
      const site = createSite({ logoUrl: undefined });

      const { getByTestId, queryByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(queryByTestId('site-logo-image')).toBeNull();
      expect(getByTestId('site-logo-fallback')).toBeOnTheScreen();
    });
  });

  describe('interaction', () => {
    it('calls onPress when pressed', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      fireEvent.press(getByTestId('site-row-item'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('is pressable and interactive', () => {
      const site = createSite();

      const { getByTestId } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      const pressable = getByTestId('site-row-item');
      expect(pressable).toBeOnTheScreen();

      // Verify it's a touchable element by checking it has onPress
      fireEvent.press(pressable);
      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('renders site with empty displayUrl', () => {
      const site = createSite({ displayUrl: '' });

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(getByText('MetaMask')).toBeOnTheScreen();
    });

    it('renders site with long name', () => {
      const site = createSite({
        name: 'This is a very long site name that should be displayed correctly',
      });

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(
        getByText(
          'This is a very long site name that should be displayed correctly',
        ),
      ).toBeOnTheScreen();
    });

    it('renders site with special characters in URL', () => {
      const site = createSite({
        displayUrl: 'metamask.io/portfolio?utm_source=mobile',
      });

      const { getByText } = render(
        <SiteRowItem site={site} onPress={mockOnPress} />,
      );

      expect(
        getByText('metamask.io/portfolio?utm_source=mobile'),
      ).toBeOnTheScreen();
    });
  });
});
