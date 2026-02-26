import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <Header onToggleSidebar={() => setCollapsed((c) => !c)} />
      <div className="app-layout">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className={`app-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </main>
      </div>
    </>
  );
}
