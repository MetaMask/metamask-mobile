import { Icon } from '../components/Icon';
import './screens.css';

type SettingsScreenProps = {
  onBack: () => void;
};

const ROWS = [
  'General',
  'Security & privacy',
  'Advanced',
  'Networks',
  'Contacts',
  'Experimental',
  'About MetaMask',
] as const;

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  return (
    <div className="screen">
      <header className="top-bar">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <Icon name="arrow_back" size={18} />
        </button>
        <h1 className="screen-title">Settings</h1>
        <span className="spacer" />
      </header>

      <ul className="settings-list">
        {ROWS.map((row) => (
          <li key={row}>
            <button type="button">
              {row}
              <Icon name="chevron_right" size={20} className="row-chevron" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
