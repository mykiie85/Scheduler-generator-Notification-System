import { Icon, IconName } from '@blueprintjs/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  roles?: string[];
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/staff', label: 'Staff Database', icon: 'people' },
  { path: '/roster', label: 'Duty Roster', icon: 'calendar' },
  { path: '/weekly-allocation', label: 'Weekly Allocation', icon: 'th' },
  { path: '/holiday-scheduler', label: 'Holiday Shifts', icon: 'star' },
  { path: '/events', label: 'Events', icon: 'timeline-events' },
  { path: '/announcements', label: 'Announcements', icon: 'notifications' },
  { path: '/leave', label: 'Annual Leave', icon: 'airplane' },
  { path: '/users', label: 'User Management', icon: 'key', roles: ['ADMIN'] },
  { path: '/profile', label: 'Profile', icon: 'user' },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        {filteredItems.map((item) => (
          <div
            key={item.path}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon icon={item.icon} size={16} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="sidebar-toggle" onClick={onToggle}>
        <Icon icon={collapsed ? 'chevron-right' : 'chevron-left'} />
      </div>
    </aside>
  );
}
