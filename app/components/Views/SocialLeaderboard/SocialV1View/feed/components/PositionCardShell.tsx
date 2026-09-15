import { Box } from '@metamask/design-system-react-native';
import React from 'react';

export type PositionCardShellTone = 'muted' | 'success';

export interface PositionCardShellProps {
  tone: PositionCardShellTone;
  children: React.ReactNode;
}

const SHELL_TW_CLASS: Record<PositionCardShellTone, string> = {
  muted: 'bg-default rounded-2xl p-3 gap-3 border border-default',
  success: 'bg-default rounded-2xl p-3 gap-3 border border-success-default',
};

const PositionCardShell: React.FC<PositionCardShellProps> = ({
  tone,
  children,
}) => <Box twClassName={SHELL_TW_CLASS[tone]}>{children}</Box>;

export default PositionCardShell;
