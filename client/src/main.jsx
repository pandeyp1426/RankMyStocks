import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.jsx';
import store from './store.jsx';
import './index.css';

// Support Vite vars, with a best-effort fallback to legacy CRA-style names.
// Note: Vite only injects variables prefixed with VITE_ — the CRA names
// will typically be undefined in Vite, but this fallback adds clarity.
const domain = import.meta.env.VITE_AUTH0_DOMAIN ?? import.meta.env.REACT_APP_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID ?? import.meta.env.REACT_APP_AUTH0_CLIENT_ID;

// Diagnostics to help catch misconfiguration quickly during development
if (import.meta.env?.DEV) {
  // eslint-disable-next-line no-console
  console.log('[Auth0] domain:', domain, 'clientId:', clientId);
}

if (!domain || !clientId) {
  // eslint-disable-next-line no-console
  console.error('[Auth0] Missing environment variables. Expected VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in client/.env. After updating, restart the Vite dev server.');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
        redirect_uri: window.location.origin, 
        }}
      >
        <App />
      </Auth0Provider>
    </Provider>
  </StrictMode>
);
