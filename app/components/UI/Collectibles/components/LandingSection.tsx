import React, { type ReactNode } from 'react';
import { SectionHeader } from '@metamask/design-system-react-native';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';

interface Props {
  name: string;
  title: string;
  titleAccessory?: ReactNode;
  children?: ReactNode;
}

export function LandingSection({
  name,
  title,
  titleAccessory,
  children,
}: Props) {
  return (
    <View testID={collectiblesTestIds.landingSection(name)}>
      <SectionHeader title={title} titleAccessory={titleAccessory} />
      {children}
    </View>
  );
}
