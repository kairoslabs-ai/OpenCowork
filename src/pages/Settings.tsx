import React, { useState } from 'react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAPIStore } from '../store/apiStore';
import { useUIStore } from '../store/uiStore';
import { usePolicy } from '../hooks/usePolicy';

/**
 * Settings Page - Configure API connection, policies, and preferences
 */
export const SettingsPage: React.FC = () => {
  const apiStore = useAPIStore();
  const uiStore = useUIStore();
  const { policies, activePolicyId, setActivePolicyId, loadPolicies, isLoading: policiesLoading } = usePolicy();

  const [baseUrl, setBaseUrl] = useState(apiStore.baseUrl);
  const [token, setToken] = useState(apiStore.token || '');
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState(uiStore.theme);

  // Handle API settings save
  const handleSaveAPI = async () => {
    setIsSaving(true);

    try {
      apiStore.setBaseUrl(baseUrl);
      if (token) {
        apiStore.setToken(token);
      }

      // Show success message
      uiStore.addToast({
        id: Date.now().toString(),
        type: 'success',
        message: 'API settings saved successfully',
      });
    } catch (err) {
      uiStore.addToast({
        id: Date.now().toString(),
        type: 'error',
        message: 'Failed to save API settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    uiStore.setTheme(newTheme);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Configure OpenCowork to your preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* API Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">API Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Endpoint</label>
                <Input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Token (Optional)</label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Your API token"
                  disabled={isSaving}
                />
              </div>

              <Button
                variant="primary"
                onClick={handleSaveAPI}
                disabled={isSaving}
                loading={isSaving}
                className="w-full"
              >
                Save API Settings
              </Button>

              {/* Connectivity Status */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Connection Status</h3>
                <p className="text-sm text-blue-700">
                  {apiStore.isConnected ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      Connected to API
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      Disconnected from API
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Policy Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Policy Management</h2>

            <div className="space-y-4">
              {policiesLoading ? (
                <p className="text-gray-600">Loading policies...</p>
              ) : policies.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Active Policy</label>
                  <select
                    value={activePolicyId || ''}
                    onChange={(e) => setActivePolicyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {policies.map((policy) => (
                      <option key={policy.name} value={policy.name}>
                        {policy.name}
                      </option>
                    ))}
                  </select>

                  {/* Policy Details */}
                  {activePolicyId && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Policy Rules</h3>
                      <div className="space-y-2 text-sm">
                        {policies
                          .find((p) => p.name === activePolicyId)
                          ?.rules.slice(0, 5)
                          .map((rule, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${rule.allow ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-gray-700">
                                {rule.action} on {rule.resource}
                              </span>
                            </div>
                          ))}
                      </div>
                      {policies.find((p) => p.name === activePolicyId)?.rules.length! > 5 && (
                        <p className="mt-3 text-gray-500 text-xs">
                          +{policies.find((p) => p.name === activePolicyId)?.rules.length! - 5} more rules
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">No policies available. Configure policies on the backend.</p>
              )}

              <Button
                variant="secondary"
                onClick={loadPolicies}
                disabled={policiesLoading}
                className="w-full"
              >
                Refresh Policies
              </Button>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Appearance</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">About</h2>

            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <label className="font-medium text-gray-900">Version</label>
                <p>0.1.0a</p>
              </div>
              <div>
                <label className="font-medium text-gray-900">License</label>
                <p>MIT</p>
              </div>
              <div>
                <label className="font-medium text-gray-900">Repository</label>
                <a
                  href="https://github.com/opencowork/opencowork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
