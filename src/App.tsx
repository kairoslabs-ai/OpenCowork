import React, { useState } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { HomePage, HistoryPage, SettingsPage, TaskDetailPage } from './pages';
import { useUIStore } from './store/uiStore';

type PageType = 'home' | 'history' | 'settings' | 'task-detail';

/**
 * App Component - Main application router and layout
 */
export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const { toasts, removeToast, sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-white">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
        >
          {/* Logo */}
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            {sidebarOpen && <h1 className="text-xl font-bold">OpenCowork</h1>}
            <button
              onClick={toggleSidebar}
              className="hover:bg-gray-800 p-2 rounded transition-colors"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'history', label: 'History', icon: '📋' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id as PageType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 text-sm text-gray-400">
            {sidebarOpen && (
              <p>v0.1.0a</p>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Page Content */}
          <div className="flex-1 overflow-y-auto">
            {currentPage === 'home' && <HomePage />}
            {currentPage === 'history' && (
              <HistoryPage onTaskSelect={() => setCurrentPage('task-detail')} />
            )}
            {currentPage === 'settings' && <SettingsPage />}
            {currentPage === 'task-detail' && (
              <TaskDetailPage onBack={() => setCurrentPage('history')} task={null} />
            )}
          </div>

          {/* Notifications Container */}
          <div className="fixed bottom-4 right-4 space-y-2 max-w-md">
            {toasts.map((toast) => {
              const icons = {
                success: '✓',
                error: '✕',
                warning: '!',
                info: 'ℹ',
              };

              const colors = {
                success: 'bg-green-500',
                error: 'bg-red-500',
                warning: 'bg-yellow-500',
                info: 'bg-blue-500',
              };

              return (
                <div
                  key={toast.id}
                  className={`${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-slide-in`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{icons[toast.type]}</span>
                    <span>{toast.message}</span>
                  </div>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="ml-4 hover:opacity-75"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default App;
