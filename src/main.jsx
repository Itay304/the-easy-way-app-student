import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
  })

  // skipWaiting()+clients.claim() (service-worker.js) משתלטים מיד על
  // הטאב, אבל לא מרעננים JS שכבר רץ בזיכרון. controllerchange יורה כש-SW
  // חדש משתלט בפועל — רענון חד-פעמי כאן הוא מה שבאמת מעביר טאב פתוח
  // לקוד החדש, בלי שהמשתמש יצטרך לסגור את האפליקציה ידנית.
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
