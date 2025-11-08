import { AppProviders } from './app/providers/AppProviders';
import { AppShell } from './components/layout/AppShell';
import { AppRoutes } from './app/routes';

function App() {
  return (
    <AppProviders>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </AppProviders>
  );
}

export default App;