import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Database,
  Brain,
  Plug,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  FileQuestion, // Add this import for FAQ Manager icon
} from 'lucide-react';
import { classNames } from '../../utils';
import { ThemeContext } from '../../app/providers/AppProviders';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Knowledge Base', href: '/knowledge', icon: Database },
  { name: 'Tickets', href: '/tickets', icon: MessageSquare },
  { name: 'AI Learning', href: '/ai-learning', icon: Brain },
  { name: 'FAQ Manager', href: '/faq-manager', icon: FileQuestion }, // Add FAQ Manager
  { name: 'Integrations', href: '/integrations', icon: Plug },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  // theme from provider
  const { theme, toggleTheme } = React.useContext(ThemeContext);

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Custom light palette (beige / off-white / soft brown / warm accent)
  // Hexs supplied: #F5ECE5 (beige), #333333 (dark), #E89F88 (warm accent), #FDFBFA (offwhite)
  const getThemeClasses = () => {
    if (theme === 'light') {
      return {
        sidebar: 'bg-[#FDFBFA] border-[#F5ECE5]',
        sidebarText: 'text-[#333333]',
        sidebarTextSecondary: 'text-[#6b5f57]', // muted brownish for secondary
        sidebarHover: 'hover:bg-[#F5ECE5]/60',
        header: 'bg-[#FDFBFA] border-[#F5ECE5]',
        headerText: 'text-[#333333]',
        main: 'bg-[#F5ECE5]/50',
        activeNav: 'bg-[#E89F88]/10 text-[#333333] ring-[#E89F88]/20',
        button: 'text-[#6b5f57] hover:text-[#333333] hover:bg-[#F5ECE5]/60',
        logoBg: 'bg-[#E89F88]',
        logoIcon: 'text-white',
        focusRing: 'focus-visible:ring-[#E89F88]/60',
      } as const;
    }
    return {
      sidebar: 'bg-gradient-to-b from-gray-900/70 to-gray-900/40 backdrop-blur-xl border-white/10',
      sidebarText: 'text-white',
      sidebarTextSecondary: 'text-gray-300',
      sidebarHover: 'hover:bg-white/5',
      header: 'bg-gray-900/70 backdrop-blur-xl border-white/10',
      headerText: 'text-white',
      main: 'bg-gradient-to-b from-gray-950 to-gray-900',
      activeNav: 'bg-blue-500/10 text-white ring-blue-400/30',
      button: 'text-gray-300 hover:text-white hover:bg-white/5',
      logoBg: 'bg-blue-600/90',
      logoIcon: 'text-white',
      focusRing: 'focus-visible:ring-blue-500/60',
    } as const;
  };

  const themeClasses = getThemeClasses();

  return (
    <div className="flex h-dvh">
      {/* Mobile overlay */}
      <div
        className={classNames(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      {/* Sidebar (desktop) */}
      <aside
        className={classNames(
          'fixed z-50 md:z-30 left-0 top-0 h-full border-r',
          themeClasses.sidebar,
          'shadow-[0_0_1px_0_rgba(255,255,255,0.25),_0_10px_30px_-12px_rgba(0,0,0,0.06)]',
          'transition-all duration-300',
          'md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-[4.25rem]' : 'w-64'
        )}
        aria-label="Sidebar navigation"
      >
        {/* Sidebar header / brand */}
        <div className={classNames(
          'flex items-center h-16 px-3 md:px-4 border-b relative',
          theme === 'light' ? 'border-transparent' : 'border-white/10'
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={classNames(
              "relative grid place-items-center w-10 h-10 md:w-9 md:h-9 rounded-2xl text-white shadow-inner shrink-0",
              collapsed ? "group cursor-pointer" : "",
              themeClasses.logoBg
            )}
            onClick={collapsed ? () => setCollapsed(false) : undefined}
            >
              {collapsed ? (
                <div className="relative w-5 h-5 overflow-hidden">
                  <MessageSquare 
                    className={classNames("w-5 h-5 absolute top-0 left-0 transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:scale-75 opacity-100 scale-100", themeClasses.logoIcon)}
                  />
                  <ChevronRight 
                    className={classNames("w-5 h-5 absolute top-0 left-0 transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:scale-100 opacity-0 scale-100", themeClasses.logoIcon)}
                  />
                </div>
              ) : (
                <MessageSquare className={classNames("w-5 h-5", themeClasses.logoIcon)} />
              )}
            </div>
            {!collapsed && (
              <span className={classNames(
                'truncate text-base font-semibold tracking-tight',
                themeClasses.sidebarText
              )}>
                AI Support
              </span>
            )}
          </div>

          {/* Enhanced Toggle Button - Only show when not collapsed */}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={classNames(
                'ml-auto hidden md:inline-flex items-center justify-center rounded-xl h-9 w-9',
                themeClasses.button,
                'transition-all duration-200',
                themeClasses.focusRing
              )}
              aria-label="Collapse sidebar"
              title="Collapse"
            >
              <ChevronLeft className="w-4 h-4 transition-transform duration-200" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="px-2 py-3 md:px-3 md:py-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={classNames(
                      'group relative flex items-center rounded-xl',
                      collapsed ? 'justify-center px-2 py-3' : 'px-2.5 py-3',
                      'text-sm outline-none select-none ring-1 ring-transparent transition-all duration-200',
                      isActive
                        ? themeClasses.activeNav
                        : classNames(
                            themeClasses.sidebarTextSecondary,
                            themeClasses.sidebarHover,
                            theme === 'light' 
                              ? 'hover:text-[#333333]' 
                              : 'hover:text-white hover:ring-white/10'
                          )
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className={classNames("w-5 h-5 flex-shrink-0", theme === 'light' ? 'text-[#6b5f57]' : '')} />
                    {!collapsed && (
                      <span className="ml-3 min-w-0 flex-1 truncate" style={{ color: theme === 'light' ? undefined : undefined }}>{item.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col md:pl-0">
        <header className={classNames(
          'sticky top-0 z-20 h-16 w-full border-b',
          themeClasses.header
        )}>
          <div className="flex h-full items-center justify-between px-3 md:px-6">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={classNames(
                  'md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl',
                  themeClasses.button,
                  themeClasses.focusRing
                )}
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className={classNames(
                'truncate text-lg font-semibold tracking-tight',
                themeClasses.headerText
              )}>
                Support Agent Console
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme toggle button */}
              <button
                type="button"
                onClick={toggleTheme}
                className={classNames(
                  'inline-flex items-center justify-center h-9 w-9 rounded-xl',
                  themeClasses.button,
                  themeClasses.focusRing,
                  'transition-colors'
                )}
                aria-label="Toggle theme"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        <main className={classNames('flex-1 overflow-auto', themeClasses.main)}>
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      <div
        className={classNames(
          'fixed z-50 top-0 left-0 h-full w-72 border-r md:hidden',
          themeClasses.sidebar,
          'shadow-2xl transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className={classNames(
          'flex items-center h-16 px-4 border-b',
          theme === 'light' ? 'border-transparent' : 'border-white/10'
        )}>
          <div className="flex items-center gap-2">
            <div className={classNames("grid place-items-center w-10 h-10 rounded-2xl", themeClasses.logoBg)}>
              <MessageSquare className={classNames("w-5 h-5", themeClasses.logoIcon)} />
            </div>
            <span className={classNames(
              'text-base font-semibold',
              themeClasses.sidebarText
            )}>
              AI Support
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className={classNames(
              'ml-auto inline-flex items-center justify-center h-9 w-9 rounded-xl',
              themeClasses.button,
              themeClasses.focusRing
            )}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="px-3 py-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={classNames(
                      'group relative flex items-center rounded-xl px-3 py-3 text-sm',
                      'ring-1 ring-transparent transition-all duration-200',
                      isActive
                        ? themeClasses.activeNav
                        : classNames(
                            themeClasses.sidebarTextSecondary,
                            themeClasses.sidebarHover,
                            theme === 'light' 
                              ? 'hover:text-[#333333]' 
                              : 'hover:text-white hover:ring-white/10'
                          )
                    )}
                  >
                    <item.icon className={classNames("w-5 h-5 flex-shrink-0", theme === 'light' ? 'text-[#6b5f57]' : '')} />
                    <span className="ml-3 truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
};
