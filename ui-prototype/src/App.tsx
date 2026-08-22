import { useState } from 'react';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { TradeSheet } from './components/TradeSheet';
import type { TabId, TokenSymbol } from './data/mock';
import { AssetDetailsScreen } from './screens/AssetDetailsScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { HomeScreen } from './screens/HomeScreen';
import { MoneyScreen } from './screens/MoneyScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import './App.css';

export default function App() {
  const [tab, setTab] = useState<TabId>('home');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenSymbol | null>(null);
  const [tokenLeaving, setTokenLeaving] = useState(false);

  const openToken = (symbol: TokenSymbol) => {
    setTokenLeaving(false);
    setSelectedToken(symbol);
  };

  const closeToken = () => {
    if (!selectedToken || tokenLeaving) return;
    setTokenLeaving(true);
  };

  const handleTokenPanelAnimationEnd = () => {
    if (!tokenLeaving) return;
    setSelectedToken(null);
    setTokenLeaving(false);
  };

  const handleSelectTab = (next: TabId) => {
    if (next === 'trade') {
      setTradeOpen(true);
      return;
    }
    setSettingsOpen(false);
    setSelectedToken(null);
    setTokenLeaving(false);
    setTab(next);
  };

  let content = (
    <HomeScreen
      onOpenSettings={() => setSettingsOpen(true)}
      onOpenToken={openToken}
    />
  );
  if (settingsOpen) {
    content = <SettingsScreen onBack={() => setSettingsOpen(false)} />;
  } else if (tab === 'explore') {
    content = <ExploreScreen />;
  } else if (tab === 'money') {
    content = <MoneyScreen />;
  } else if (tab === 'rewards') {
    content = <RewardsScreen />;
  }

  return (
    <PhoneFrame>
      <div className="app-shell">
        <div className="app-content">{content}</div>
        {!settingsOpen && <TabBar active={tab} onSelect={handleSelectTab} />}
        {selectedToken ? (
          <div
            className={`app-push-screen${tokenLeaving ? ' leaving' : ''}`}
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              handleTokenPanelAnimationEnd();
            }}
          >
            <AssetDetailsScreen symbol={selectedToken} onBack={closeToken} />
          </div>
        ) : null}
        <TradeSheet open={tradeOpen} onClose={() => setTradeOpen(false)} />
      </div>
    </PhoneFrame>
  );
}
