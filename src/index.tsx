import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App'; // Using alias
import { GenAIProvider } from '@contexts/GenAIContext';
import { ThemeProvider } from '@contexts/ThemeContext'; // Import ThemeProvider

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider> {/* Add ThemeProvider wrapper */}
      <GenAIProvider>
        <App />
      </GenAIProvider>
    </ThemeProvider> {/* Close ThemeProvider wrapper */}
  </React.StrictMode>
);
