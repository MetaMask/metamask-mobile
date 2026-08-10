import { Icon } from './Icon';
import './TradeSheet.css';

const ACTIONS = [
  {
    id: 'swap',
    title: 'Swap',
    desc: 'Exchange tokens instantly',
    icon: 'swap_horiz',
  },
  {
    id: 'bridge',
    title: 'Bridge',
    desc: 'Move assets across networks',
    icon: 'compare_arrows',
  },
  {
    id: 'buy',
    title: 'Buy',
    desc: 'Purchase crypto with card',
    icon: 'add_card',
  },
  {
    id: 'sell',
    title: 'Sell',
    desc: 'Cash out to your bank',
    icon: 'payments',
  },
] as const;

type TradeSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function TradeSheet({ open, onClose }: TradeSheetProps) {
  if (!open) return null;

  return (
    <div className="trade-overlay" role="presentation" onClick={onClose}>
      <div
        className="trade-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Trade actions"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="trade-handle" />
        <h2>Trade</h2>
        <p className="trade-sub">
          Choose an action — mirrors Trade tab sheet in HomeTabs.
        </p>
        <ul className="trade-list">
          {ACTIONS.map((action) => (
            <li key={action.id}>
              <button type="button" onClick={onClose}>
                <span className="trade-icon" data-action={action.id}>
                  <Icon name={action.icon} size={22} />
                </span>
                <span>
                  <strong>{action.title}</strong>
                  <small>{action.desc}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="trade-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
