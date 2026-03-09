import { Button, Icon } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <Button
        minimal
        icon="menu"
        onClick={onToggleSidebar}
        style={{ color: 'white', marginRight: 12 }}
      />
      <Icon icon="lab-test" style={{ marginRight: 8 }} />
      <h1>Lab Scheduler</h1>
      <div className="header-right">
        <span className="user-name" style={{ fontSize: 13, opacity: 0.85 }}>{user?.fullName}</span>
        <Button minimal icon="log-out" onClick={logout} style={{ color: 'white' }} />
      </div>
    </header>
  );
}
