import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../../../src/App';
import './phone.css';

function renderApp() {
  createRoot(document.getElementById('root')!).render(<App />);
}

const isDevelopment = !('invokeNative' in window);

// lb-phone loads its components first, then tells the app to start
if (isDevelopment) {
  renderApp();
} else if (window.name === '') {
  window.addEventListener('message', (event) => {
    if (event.data === 'componentsLoaded') renderApp();
  });
}
