export const Settings = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Configure system preferences and user settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
          <div className="space-y-4">
            {/* TODO: Implement settings forms */}
            <p className="text-gray-500">General settings placeholder</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Preferences</h3>
          <div className="space-y-4">
            {/* TODO: Implement user preference controls */}
            <p className="text-gray-500">User preferences placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );
};