import { useId, useState } from 'react';
import { Icon } from '../components/Icon';
import { QuickBuySheet } from '../components/QuickBuySheet';
import {
  CHART_PERIODS,
  TOKEN_CHART,
  TOKEN_DETAILS,
  TOKENS,
  type ChartPeriod,
  type TokenSymbol,
} from '../data/mock';
import './screens.css';

type AssetDetailsScreenProps = {
  symbol: TokenSymbol;
  onBack: () => void;
};

const CHART_WIDTH = 340;
const CHART_HEIGHT = 280;
/** Matches AMBIENT_NEGATIVE_COLOR in the app TokenDetails AB test. */
const CHART_DOWN = '#FF5C16';
const CHART_UP = '#baf24a';

function buildSparklinePath(series: number[], width: number, height: number) {
  const padY = 8;
  const usable = height - padY * 2;
  const step = series.length > 1 ? width / (series.length - 1) : width;

  const points = series.map((value, index) => ({
    x: index * step,
    y: padY + (1 - value) * usable,
  }));

  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }

  // Catmull-Rom → cubic Bézier for smooth segments through each point.
  const tension = 1 / 6;
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

function AssetPriceChart({ symbol }: { symbol: TokenSymbol }) {
  const [period, setPeriod] = useState<ChartPeriod>('1D');
  const chart = TOKEN_CHART[symbol];
  const accent = chart.up ? CHART_UP : CHART_DOWN;
  const path = buildSparklinePath(chart.series, CHART_WIDTH, CHART_HEIGHT);
  const last = chart.series[chart.series.length - 1] ?? 0.5;
  const endX = CHART_WIDTH;
  const endY = 8 + (1 - last) * (CHART_HEIGHT - 16);

  return (
    <section className="asset-price-chart" aria-label="Price chart">
      <div className="asset-price-summary">
        <strong className="asset-price-value">{chart.price}</strong>
        <p className={`asset-price-change ${chart.up ? 'up' : 'down'}`}>
          {chart.absoluteChange} ({chart.percentChange}){' '}
          <span className="asset-price-period">{chart.periodLabel}</span>
        </p>
      </div>

      <div
        className="asset-chart-periods"
        role="tablist"
        aria-label="Chart period"
      >
        {CHART_PERIODS.map((item) => {
          const selected = item === period;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`asset-chart-period${selected ? ' selected' : ''}`}
              style={
                selected
                  ? { background: accent, color: 'var(--primary-inverse)' }
                  : { color: accent }
              }
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="asset-chart-canvas">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          width="100%"
          height={CHART_HEIGHT}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={path}
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={endX} cy={endY} r="4" fill={accent} />
        </svg>
      </div>
    </section>
  );
}

/** Simplified Safe token mark for the header avatar. */
function SafeAvatar({ size = 40 }: { size?: number }) {
  const gradientId = useId().replace(/:/g, '');

  return (
    <span
      className="safe-avatar"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1AE8B5" />
            <stop offset="55%" stopColor="#12A88C" />
            <stop offset="100%" stopColor="#0B7A6A" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="20" fill={`url(#${gradientId})`} />
        <path
          fill="#0B1F1C"
          d="M13 12h14a1.2 1.2 0 0 1 1.2 1.2v4.6a1.2 1.2 0 0 1-1.2 1.2H21l6.2 8.7a.9.9 0 0 1-.75 1.4H19.2a1 1 0 0 1-.82-.43L12.2 19.2v8.6A1.2 1.2 0 0 1 11 29h-.8A1.2 1.2 0 0 1 9 27.8V13.2A1.2 1.2 0 0 1 10.2 12H13Zm7.4 4.8h5.4v-2.4H14.6v7.4l5.8-5Z"
        />
      </svg>
    </span>
  );
}

function TokenAvatar({
  symbol,
  color,
  icon,
  size = 40,
}: {
  symbol: TokenSymbol;
  color: string;
  icon: string;
  size?: number;
}) {
  if (symbol === 'SAFE') {
    return <SafeAvatar size={size} />;
  }

  return (
    <span
      className="token-icon asset-header-icon"
      style={{ background: color, width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} />
    </span>
  );
}

export function AssetDetailsScreen({
  symbol,
  onBack,
}: AssetDetailsScreenProps) {
  const [quickBuyOpen, setQuickBuyOpen] = useState(false);
  const token = TOKENS.find((item) => item.symbol === symbol) ?? TOKENS[0];
  const details = TOKEN_DETAILS[token.symbol];
  const networkBadge = details.network === 'Solana' ? 'S' : 'E';

  return (
    <div className="asset-screen">
      <header className="asset-header">
        <button
          type="button"
          className="asset-back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <Icon name="arrow_left" size={24} />
        </button>

        <div className="asset-header-identity">
          <span className="asset-header-icon-wrap">
            <TokenAvatar
              symbol={token.symbol}
              color={token.color}
              icon={token.icon}
              size={40}
            />
            <span className="asset-unknown-badge" aria-hidden>
              ?
            </span>
          </span>
          <div className="asset-header-copy">
            <div className="asset-header-name">
              <strong>{token.symbol}</strong>
              {token.verified ? (
                <Icon
                  name="verified"
                  size={18}
                  filled
                  className="verified-icon"
                  label="Verified"
                />
              ) : null}
            </div>
            <button type="button" className="asset-header-address">
              <span>{details.contractAddress}</span>
              <Icon name="content_copy" size={13} className="copy-icon" />
            </button>
          </div>
        </div>

        <div className="asset-header-actions">
          <button
            type="button"
            className="asset-action-btn"
            aria-label="Favorite"
          >
            <Icon name="star" size={22} />
          </button>
          <button
            type="button"
            className="asset-action-btn"
            aria-label="Alerts"
          >
            <Icon name="notifications" size={22} />
          </button>
          <button type="button" className="asset-action-btn" aria-label="Share">
            <Icon name="ios_share" size={22} />
          </button>
        </div>
      </header>

      <div className="asset-body">
        <AssetPriceChart symbol={token.symbol} />

        <section className="asset-section">
          <h2 className="asset-section-title">Your balance</h2>
          <div className="asset-balance-row">
            <span className="token-icon-wrap">
              <TokenAvatar
                symbol={token.symbol}
                color={token.color}
                icon={token.icon}
                size={40}
              />
              <span
                className="network-badge eth icon-badge"
                aria-label={details.network}
              >
                {networkBadge}
              </span>
            </span>
            <span className="token-meta">
              <strong>{token.name}</strong>
              <small>{token.amount}</small>
            </span>
            <span className="token-value">
              <strong>{token.fiat}</strong>
              <small className={token.up ? 'up' : 'down'}>{token.change}</small>
            </span>
          </div>
        </section>

        <section className="asset-section">
          <h2 className="asset-section-title">Token details</h2>
          <dl className="details-list">
            <div>
              <dt>Contract address</dt>
              <dd>
                {details.contractAddress}
                <Icon name="content_copy" size={14} className="copy-icon" />
              </dd>
            </div>
            <div>
              <dt>Token decimal</dt>
              <dd>{details.tokenDecimal}</dd>
            </div>
          </dl>
        </section>

        <section className="asset-section">
          <h2 className="asset-section-title">Market details</h2>
          <dl className="details-list">
            <div>
              <dt>Market cap</dt>
              <dd>{details.marketCap}</dd>
            </div>
            <div>
              <dt>Total volume (24h)</dt>
              <dd>{details.totalVolume}</dd>
            </div>
            <div>
              <dt>Volume / Market cap</dt>
              <dd>{details.volumeToMarketCap}</dd>
            </div>
            <div>
              <dt>Circulating supply</dt>
              <dd>{details.circulatingSupply}</dd>
            </div>
            <div>
              <dt>All time high</dt>
              <dd>{details.allTimeHigh}</dd>
            </div>
            <div>
              <dt>All time low</dt>
              <dd>{details.allTimeLow}</dd>
            </div>
            <div>
              <dt>Fully diluted</dt>
              <dd>{details.fullyDiluted}</dd>
            </div>
          </dl>
        </section>

        <section className="asset-section">
          <button type="button" className="asset-security">
            <span className="asset-security-header">
              <span className="asset-section-title">Security and trust</span>
              <Icon name="chevron_right" size={20} className="row-chevron" />
            </span>
            <span className="asset-security-status">
              {details.securityStatus}
            </span>
            <span className="asset-security-tags">
              {[
                'Established reputation',
                'Listed on exchange',
                'Published contract',
              ].map((tag) => (
                <span key={tag} className="asset-security-tag">
                  <span className="asset-security-tag-icon" aria-hidden>
                    <Icon name="check" size={12} />
                  </span>
                  {tag}
                </span>
              ))}
            </span>
          </button>
        </section>
      </div>

      <footer className="asset-footer">
        <button type="button" className="asset-cta asset-cta-secondary">
          <Icon name="swap_vert" size={20} />
          Swap
        </button>
        <button type="button" className="asset-cta asset-cta-primary">
          <Icon name="account_balance" size={20} />
          Buy
        </button>
        <button
          type="button"
          className="asset-cta asset-cta-icon"
          aria-label="Quick buy"
          onClick={() => setQuickBuyOpen(true)}
        >
          <Icon name="bolt" size={22} filled />
        </button>
      </footer>

      <QuickBuySheet
        open={quickBuyOpen}
        symbol={token.symbol}
        onClose={() => setQuickBuyOpen(false)}
      />
    </div>
  );
}
