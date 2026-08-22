import './screens.css';

export function RewardsScreen() {
  return (
    <div className="screen">
      <header className="top-bar single">
        <h1 className="screen-title">Rewards</h1>
      </header>

      <section className="rewards-hero">
        <p className="eyebrow-inline">Season points</p>
        <h2>12,480</h2>
        <p>Keep exploring to climb the leaderboard.</p>
        <div className="progress">
          <div className="progress-fill" style={{ width: '62%' }} />
        </div>
        <small>62% to next level</small>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Ways to earn</h2>
        </div>
        <ul className="earn-list">
          <li>
            <strong>Swap weekly</strong>
            <span>+500 pts</span>
          </li>
          <li>
            <strong>Bridge assets</strong>
            <span>+300 pts</span>
          </li>
          <li>
            <strong>Use MetaMask Card</strong>
            <span>+750 pts</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
