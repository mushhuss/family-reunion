// React entry point — mounts <App /> into #root with StrictMode.
// index.css is imported here so Tailwind and custom fonts load before any component renders.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
