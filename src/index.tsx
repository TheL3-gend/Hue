import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App'; // Using alias
import { GenAIProvider } from '@contexts/GenAIContext';
// ThemeProvider for example apps is typically within their own structure.
// Hue's global styles are via Tailwind/index.css.
// If a global ThemeProvider for Hue itself is desired, it can be added.
// For now, keeping it clean as ThemeContext is for in-project themes.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GenAIProvider>
      <App />
    </GenAIProvider>
  </React.StrictMode>
);
