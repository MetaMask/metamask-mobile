import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AssetActionButton from '.';

describe('AssetActionButtons', () => {
  const mockText = 'mock text';

  it('should render correctly', () => {
    render(<AssetActionButton label={mockText} />);
    expect(screen.getByText(mockText)).toBeOnTheScreen();
  });

  it('should render type send correctly', () => {
    render(<AssetActionButton icon="send" label={mockText} />);
    expect(screen.getByText(mockText)).toBeOnTheScreen();
  });

  it('should render type receive correctly', () => {
    const text = 'receive receive';
    render(<AssetActionButton icon="receive" label={text} />);
    // Label longer than 10 chars gets truncated to first 7 chars + '...'
    expect(screen.getByText('receive...')).toBeOnTheScreen();
  });

  it('should render type add correctly', () => {
    render(<AssetActionButton icon="add" label={mockText} />);
    expect(screen.getByText(mockText)).toBeOnTheScreen();
  });

  it('should render type information correctly', () => {
    render(<AssetActionButton icon="information" label={mockText} />);
    expect(screen.getByText(mockText)).toBeOnTheScreen();
  });

  it('should render type swap correctly', () => {
    render(<AssetActionButton icon="swap" label={mockText} />);
    expect(screen.getByText(mockText)).toBeOnTheScreen();
  });
});
