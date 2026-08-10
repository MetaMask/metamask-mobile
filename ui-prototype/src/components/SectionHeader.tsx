import type { ReactNode } from 'react';
import { Icon } from './Icon';
import './SectionHeader.css';

type SectionHeaderProps = {
  title: ReactNode;
  isInteractive?: boolean;
  onClick?: () => void;
  className?: string;
};

/**
 * Web prototype of MMDS SectionHeader (interactive).
 * @see https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/SectionHeader/SectionHeader.tsx
 *
 * - Title: TextVariant.HeadingMd + TextColor.TextDefault
 * - End icon: ArrowRight, IconSize.Sm, IconColor.IconAlternative (when interactive)
 * - Padding: px-4 pb-2 pt-3 (horizontal omitted here — parent screen already pads)
 */
export function SectionHeader({
  title,
  isInteractive = true,
  onClick,
  className,
}: SectionHeaderProps) {
  const classes = ['section-header', className].filter(Boolean).join(' ');

  if (isInteractive) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        <span className="section-header-title">{title}</span>
        <Icon
          name="chevron_right"
          size={16}
          className="section-header-end-icon"
        />
      </button>
    );
  }

  return (
    <div className={classes}>
      <span className="section-header-title">{title}</span>
    </div>
  );
}
