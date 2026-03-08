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
          <footer style={{ marginTop: 'auto', paddingTop: 24, paddingBottom: 8, textAlign: 'center', fontSize: 10, color: '#aab4c0', letterSpacing: 0.3 }}>
            Developed by Mike Sanga &middot; mykiie85@gmail.com
          </footer>
        </main>
      </div>
    </>
  );
}
