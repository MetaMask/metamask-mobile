import { Icon } from './Icon';
import type { TabId } from '../data/mock';
import './TabBar.css';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'explore', label: 'Explore', icon: 'trending_up' },
  { id: 'trade', label: 'Trade', icon: 'add' },
  { id: 'money', label: 'Money', icon: 'monetization_on' },
  { id: 'rewards', label: 'Rewards', icon: 'metamask_fox' },
];

type TabBarProps = {
  active: TabId;
  onSelect: (tab: TabId) => void;
};

export function TabBar({ active, onSelect }: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label="Primary">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const isTrade = tab.id === 'trade';
        return (
          <button
            key={tab.id}
            type="button"
            className={`tab-item${isActive ? ' is-active' : ''}${isTrade ? ' is-trade' : ''}`}
            onClick={() => onSelect(tab.id)}
            aria-label={isTrade ? tab.label : undefined}
          >
            <span className={isTrade ? 'trade-fab' : undefined}>
              <Icon
                name={tab.icon}
                size={isTrade ? 26 : 22}
                filled={isActive && !isTrade}
              />
            </span>
            {!isTrade && <span>{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
