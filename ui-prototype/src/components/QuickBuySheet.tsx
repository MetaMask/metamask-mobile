import { useEffect, useMemo, useState } from 'react';
import { TOKEN_CHART, type TokenSymbol } from '../data/mock';
import { Icon } from './Icon';
import './QuickBuySheet.css';

type TradeMode = 'buy' | 'sell';

type QuickBuySheetProps = {
  open: boolean;
  symbol: TokenSymbol;
  onClose: () => void;
};

const QUICK_AMOUNTS = [10, 50, 100, 250] as const;
const KEYPAD: (string | 'backspace')[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

function parsePrice(priceLabel: string): number {
  const n = Number(priceLabel.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function formatFiatDisplay(raw: string): string {
  if (!raw || raw === '.') return '$0';
  if (raw.startsWith('.')) return `$${raw}`;
  return `$${raw}`;
}

function formatTokenAmount(fiat: number, price: number): string {
  if (fiat <= 0) return '0';
  const amount = fiat / price;
  if (amount >= 1000)
    return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (amount >= 1)
    return amount.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function applyKey(current: string, key: string): string {
  if (key === 'backspace') {
    return current.slice(0, -1);
  }
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }
  // Cap length so the headline stays readable.
  if (current.replace('.', '').length >= 8) return current;
  if (current === '0' && key !== '.') return key;
  return `${current}${key}`;
}

export function QuickBuySheet({ open, symbol, onClose }: QuickBuySheetProps) {
  const [mode, setMode] = useState<TradeMode>('buy');
  const [amount, setAmount] = useState('');

  const price = useMemo(() => parsePrice(TOKEN_CHART[symbol].price), [symbol]);
  const fiatValue = Number(amount) || 0;
  const tokenAmount = formatTokenAmount(fiatValue, price);
  const totalLabel = fiatValue > 0 ? `$${fiatValue.toFixed(2)}` : '$0.00';

  useEffect(() => {
    if (!open) {
      setMode('buy');
      setAmount('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="qb-overlay" role="presentation" onClick={onClose}>
      <div
        className="qb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Quick buy"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qb-handle" />

        <header className="qb-toolbar">
          <button type="button" className="qb-icon-btn" aria-label="Settings">
            <Icon name="settings" size={22} />
          </button>

          <div
            className="qb-mode-toggle"
            role="tablist"
            aria-label="Trade mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'buy'}
              className={`qb-mode-option${mode === 'buy' ? ' selected' : ''}`}
              onClick={() => setMode('buy')}
            >
              Buy
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'sell'}
              className={`qb-mode-option${mode === 'sell' ? ' selected' : ''}`}
              onClick={() => setMode('sell')}
            >
              Sell
            </button>
          </div>

          <button
            type="button"
            className="qb-icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="close" size={22} />
          </button>
        </header>

        <button
          type="button"
          className="qb-amount"
          onClick={() => undefined}
          aria-label="Amount"
        >
          <span className="qb-amount-primary">
            {formatFiatDisplay(amount)}
            <span className="qb-cursor" aria-hidden />
          </span>
          <span className="qb-amount-secondary">
            {tokenAmount} {symbol}
          </span>
        </button>

        <div className="qb-footer-block">
          <div className="qb-quick-amounts">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                className={`qb-chip${amount === String(value) ? ' selected' : ''}`}
                onClick={() => setAmount(String(value))}
              >
                ${value}
              </button>
            ))}
          </div>

          <div className="qb-rows">
            <button type="button" className="qb-row">
              <span className="qb-row-label">
                {mode === 'sell' ? 'Receive' : 'Pay with'}
              </span>
              <span className="qb-row-value">
                <span className="qb-eth-icon" aria-hidden>
                  ◆
                </span>
                ETH ($0.18)
                <Icon
                  name="chevron_right"
                  size={16}
                  className="qb-row-chevron"
                />
              </span>
            </button>

            <button type="button" className="qb-row">
              <span className="qb-row-label">Total</span>
              <span className="qb-row-value">
                {totalLabel}
                <Icon
                  name="chevron_right"
                  size={16}
                  className="qb-row-chevron"
                />
              </span>
            </button>
          </div>

          <button
            type="button"
            className={`qb-confirm qb-confirm-${mode}`}
            onClick={onClose}
          >
            {mode === 'buy' ? 'Buy' : 'Sell'}
          </button>
          <p className="qb-fee">Includes 0.875% MetaMask fee</p>
        </div>

        <div className="qb-keypad" aria-label="Keypad">
          {KEYPAD.map((row) => (
            <div key={row.join('-')} className="qb-keypad-row">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`qb-key${key === 'backspace' || key === '.' ? ' qb-key-icon' : ''}`}
                  aria-label={key === 'backspace' ? 'Delete' : key}
                  onClick={() => setAmount((prev) => applyKey(prev, key))}
                >
                  {key === 'backspace' ? (
                    <Icon name="backspace" size={26} />
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
