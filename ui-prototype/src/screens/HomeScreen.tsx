import { Icon } from '../components/Icon';
import {
  ACTIONS,
  DEFI_POSITIONS,
  NFTS,
  PERPETUALS,
  PERPETUALS_SUMMARY,
  PREDICTIONS,
  TOKENS,
  WATCHLIST,
} from '../data/mock';
import './screens.css';

type HomeScreenProps = {
  onOpenSettings: () => void;
  onOpenToken: (symbol: (typeof TOKENS)[number]['symbol']) => void;
};

function HeaderIcon({
  name,
  onClick,
  badge,
  label,
}: {
  name: string;
  onClick?: () => void;
  badge?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      className="header-icon"
      onClick={onClick}
      aria-label={label}
    >
      <Icon name={name} size={20} />
      {badge ? <span className="header-badge" /> : null}
    </button>
  );
}

export function HomeScreen({ onOpenSettings, onOpenToken }: HomeScreenProps) {
  return (
    <div className="screen home-screen">
      <header className="wallet-header">
        <button type="button" className="account-picker">
          Account 1
          <Icon name="expand_more" size={18} />
        </button>
        <div className="header-actions">
          <HeaderIcon label="Search" name="search" />
          <HeaderIcon label="Activity" name="schedule" />
          <HeaderIcon label="Accounts" name="filter_none" />
          <HeaderIcon label="Menu" name="menu" onClick={onOpenSettings} badge />
        </div>
      </header>

      <section className="balance-block">
        <h1 className="balance">$4.96</h1>
        <p className="balance-delta">
          <span className="text-success">+$0.02</span>
          <span className="text-success">(+0.34%)</span>
        </p>
      </section>

      <div className="action-grid">
        {ACTIONS.map((action) => (
          <button key={action.id} type="button" className="action-btn">
            <span className="action-icon">
              <Icon name={action.icon} size={22} />
            </span>
            {action.label}
          </button>
        ))}
      </div>

      <section className="money-card">
        <div className="money-card-copy">
          <div className="money-card-title">
            Money balance · mUSD
            <Icon name="info" size={14} className="info-icon" />
          </div>
          <div className="money-card-row">
            <strong className="money-balance">$3.12</strong>
            <span className="text-success money-apy">7.1% APY</span>
          </div>
        </div>
        <button type="button" className="money-add">
          Add
        </button>
      </section>

      <section className="panel tokens-panel">
        <button type="button" className="section-heading">
          Tokens
          <Icon name="chevron_right" size={18} />
        </button>
        <ul className="token-list">
          {TOKENS.map((token) => (
            <li key={token.symbol}>
              <button
                type="button"
                className="token-row-btn"
                onClick={() => onOpenToken(token.symbol)}
              >
                <span
                  className="token-icon"
                  style={{ background: token.color }}
                >
                  <Icon name={token.icon} size={20} />
                </span>
                <span className="token-meta">
                  <strong>
                    {token.name}
                    {token.verified ? (
                      <Icon
                        name="verified"
                        size={14}
                        filled
                        className="verified-icon"
                        label="Verified"
                      />
                    ) : null}
                  </strong>
                  <small>
                    <span className="text-alternative">{token.price}</span>
                    {' · '}
                    <span className={token.up ? 'text-success' : 'text-error'}>
                      {token.change}
                    </span>
                  </small>
                </span>
                <span className="token-value">
                  <strong>{token.fiat}</strong>
                  <small>{token.amount}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel asset-section">
        <button type="button" className="section-heading">
          Perpetuals
          <Icon name="chevron_right" size={18} />
        </button>
        <p
          className={`section-summary ${PERPETUALS_SUMMARY.up ? 'up' : 'down'}`}
        >
          {PERPETUALS_SUMMARY.pnl} {PERPETUALS_SUMMARY.pnlPercent}{' '}
          <span className="text-alternative">Unrealized P&amp;L</span>
        </p>
        <ul className="token-list">
          {PERPETUALS.map((position) => (
            <li key={position.id}>
              <span
                className="token-icon"
                style={{ background: position.color }}
              >
                <Icon name={position.icon} size={20} />
              </span>
              <span className="token-meta">
                <strong>{position.title}</strong>
                <small>{position.amount}</small>
              </span>
              <span className="token-value">
                <strong>{position.fiat}</strong>
                <small className={position.up ? 'up' : 'down'}>
                  {position.pnl}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel asset-section">
        <button type="button" className="section-heading">
          Predictions
          <Icon name="chevron_right" size={18} />
        </button>
        <ul className="prediction-list">
          {PREDICTIONS.map((prediction) => (
            <li key={prediction.id}>
              <span className="prediction-icon">
                <Icon name={prediction.icon} size={20} />
              </span>
              <span className="token-meta">
                <strong>{prediction.title}</strong>
                <small>{prediction.subtitle}</small>
              </span>
              <span className="prediction-trailing">
                {'live' in prediction && prediction.live ? (
                  <span className="live-badge">
                    <span className="live-dot" />
                    {prediction.live}
                  </span>
                ) : null}
                <Icon name="chevron_right" size={18} className="row-chevron" />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel asset-section">
        <button type="button" className="section-heading">
          Watchlist
          <Icon name="chevron_right" size={18} />
        </button>
        <ul className="token-list">
          {WATCHLIST.map((asset) => (
            <li key={asset.symbol}>
              <span className="token-icon" style={{ background: asset.color }}>
                <Icon name={asset.icon} size={20} />
              </span>
              <span className="token-meta">
                <strong>{asset.name}</strong>
                <small>{asset.symbol}</small>
              </span>
              <span className="token-value">
                <strong>{asset.price}</strong>
                <small className={asset.up ? 'up' : 'down'}>
                  {asset.change}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel asset-section">
        <button type="button" className="section-heading">
          DeFi
          <Icon name="chevron_right" size={18} />
        </button>
        <ul className="token-list defi-list">
          {DEFI_POSITIONS.map((position) => (
            <li key={position.id}>
              <span className="token-icon-wrap">
                <span
                  className="token-icon"
                  style={{ background: position.color }}
                >
                  <Icon name={position.icon} size={20} />
                </span>
                <NetworkBadge kind={position.badge} className="icon-badge" />
              </span>
              <span className="token-meta">
                <strong>{position.name}</strong>
                <small>{position.subtitle}</small>
              </span>
              <span className="token-value">
                <strong>{position.fiat}</strong>
                <NetworkBadge
                  kind={position.trailing}
                  className="value-badge"
                />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel asset-section">
        <button type="button" className="section-heading">
          NFTs
          <Icon name="chevron_right" size={18} />
        </button>
        <div className="nft-grid">
          {NFTS.map((nft) => (
            <article key={nft.id} className="nft-card">
              <div className="nft-art" style={{ background: nft.tone }}>
                {nft.label ? (
                  <span className="nft-art-label">{nft.label}</span>
                ) : null}
                <NetworkBadge kind="eth" className="nft-badge" />
              </div>
              <strong>{nft.title}</strong>
              <small>{nft.collection}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function NetworkBadge({
  kind,
  className,
}: {
  kind: 'eth' | 'usdt';
  className?: string;
}) {
  return (
    <span
      className={`network-badge ${kind}${className ? ` ${className}` : ''}`}
      aria-label={kind === 'usdt' ? 'USDT' : 'Ethereum'}
    >
      <Icon name={kind === 'usdt' ? 'attach_money' : 'token'} size={10} />
    </span>
  );
}
