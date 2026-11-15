import React from 'react'
import ReactDOM from 'react-dom/client'
import { hydrate, flushSync, startAutoRefresh } from './utils/sync'
import './index.css'

// Cross-device sync: pull every collection from the PostgreSQL backend and
// merge it into localStorage BEFORE the app modules load (they read their
// data from localStorage at import time). If the API is unreachable the
// app still boots from the local cache.
const rootEl = document.getElementById('root')
rootEl.innerHTML = `
  <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#f8fafc;font-family:Inter,system-ui,sans-serif">
    <div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#042938;border-radius:50%;animation:ccspin .8s linear infinite"></div>
    <div style="color:#042938;font-weight:600;letter-spacing:.3px">Loading hospital records…</div>
    <style>@keyframes ccspin{to{transform:rotate(360deg)}}</style>
  </div>`

// Push any pending edits if the tab is closed mid-debounce.
window.addEventListener('pagehide', flushSync)

hydrate()
  .catch(err => console.warn('[sync] hydrate error:', err))
  .finally(() => {
    // Live sync: re-pull the server every 30 s (and on tab refocus) so
    // records entered on another laptop appear without a manual reload.
    startAutoRefresh(30000);
    return import('./root.jsx');
  })
