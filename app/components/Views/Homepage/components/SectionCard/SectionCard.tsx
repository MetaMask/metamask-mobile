import React from 'react';
import GroupedSurface from '../../../../../component-library/components-temp/elevation/GroupedSurface';

interface SectionCardProps {
  children: React.ReactNode;
}

const SectionCard = ({ children }: SectionCardProps) => (
  <GroupedSurface radiusClassName="rounded-xl" twClassName="w-full p-4">
    {children}
  </GroupedSurface>
);

export default SectionCard;
