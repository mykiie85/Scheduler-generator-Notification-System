import { useNavigate } from 'react-router-dom';
import { Icon, IconName } from '@blueprintjs/core';
import { useAuth } from '../context/AuthContext';

interface QuickAction {
  title: string;
  description: string;
  icon: IconName;
  path: string;
}

const actions: QuickAction[] = [
  { title: 'Generate Roster', description: 'Create monthly duty roster', icon: 'calendar', path: '/roster' },
  { title: 'Staff Database', description: 'View & manage 33 staff', icon: 'people', path: '/staff' },
  { title: 'Weekly Allocation', description: 'Assign sections for the week', icon: 'th', path: '/weekly-allocation' },
  { title: 'Holiday Shifts', description: 'Schedule public holiday duty', icon: 'star', path: '/holiday-scheduler' },
  { title: 'Events', description: 'Create & notify about events', icon: 'timeline-events', path: '/events' },
  { title: 'Announcements', description: 'Send lab announcements', icon: 'notifications', path: '/announcements' },
  { title: 'Annual Leave', description: 'Manage staff leave', icon: 'airplane', path: '/leave' },
  { title: 'User Management', description: 'Approve accounts & roles', icon: 'key', path: '/users' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h2>{getGreeting()}, {user?.fullName?.split(' ')[0]}</h2>
        <p>Welcome to the Lab Scheduler. Select an action below.</p>
      </div>

      <div className="dashboard-cards">
        {actions.map((action) => (
          <div key={action.path} className="dash-card" onClick={() => navigate(action.path)}>
            <Icon icon={action.icon} size={20} style={{ color: 'var(--navy-light)', marginBottom: 8 }} />
            <h3>{action.title}</h3>
            <p>{action.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
