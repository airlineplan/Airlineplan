import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx'
import './index.css'
// Import the Provider
import { ThemeProvider } from "./context/ThemeContext"; 
import { TenantConfigProvider } from "./context/TenantConfigContext";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <TenantConfigProvider>
          <App />
        </TenantConfigProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
