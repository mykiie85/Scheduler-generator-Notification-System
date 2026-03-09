import { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  const handleToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  }, [isMobile]);

  const closeMobileDrawer = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <>
      <Header onToggleSidebar={handleToggle} />
      <div className="app-layout">
        <div
          className={`mobile-overlay${mobileOpen ? ' visible' : ''}`}
          onClick={closeMobileDrawer}
        />
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={handleToggle}
          onNavigate={closeMobileDrawer}
        />
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
