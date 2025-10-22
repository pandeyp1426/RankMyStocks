import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App.jsx';
import store from './store.jsx';
import './index.css';

// ✅ In Vite, env vars must be accessed via import.meta.env
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

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
