import React, { FunctionComponent, ReactNode } from 'react';
import Tooltip from '../../Views/confirmations/components/UI/Tooltip';

export interface SnapUITooltipProps {
  content: ReactNode;
}

export const SnapUITooltip: FunctionComponent<SnapUITooltipProps> = ({
  content,
}) => <Tooltip content={content} />;
