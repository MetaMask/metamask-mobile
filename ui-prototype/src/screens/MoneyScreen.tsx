import './screens.css';

export function MoneyScreen() {
  return (
    <div className="screen">
      <header className="top-bar single">
        <h1 className="screen-title">Money</h1>
      </header>

      <section className="money-card">
        <div className="money-card-copy">
          <div className="money-card-title">mUSD balance</div>
          <div className="money-card-row">
            <strong style={{ fontSize: '1.4rem' }}>$0.00</strong>
            <span className="money-apy text-success">7.1% APY</span>
          </div>
        </div>
        <button type="button" className="money-add">
          Add
        </button>
      </section>

      <section className="muted-panel">
        <h2>Cash & yield</h2>
        <p className="empty-copy">
          Prototype placeholder for the Money tab — deposit, withdraw, and yield
          details.
        </p>
      </section>
    </div>
  );
}
