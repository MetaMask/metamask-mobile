import { Icon } from '../components/Icon';
import { DAPP_SHORTCUTS } from '../data/mock';
import './screens.css';

export function ExploreScreen() {
  return (
    <div className="screen">
      <header className="top-bar single">
        <h1 className="screen-title">Explore</h1>
      </header>

      <div className="search-bar">
        <Icon name="search" size={18} className="row-chevron" />
        <input readOnly placeholder="Search tokens or sites" value="" />
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Trending</h2>
        </div>
        <div className="dapp-grid">
          {DAPP_SHORTCUTS.map((dapp) => (
            <button key={dapp.host} type="button" className="dapp-card">
              <span
                className="dapp-icon"
                style={{ background: `hsl(${dapp.hue} 70% 48%)` }}
              >
                {dapp.name.slice(0, 1)}
              </span>
              <strong>{dapp.name}</strong>
              <small>{dapp.host}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
