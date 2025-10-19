import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AddApp from './pages/AddApp'
import EditApp from './pages/EditApp'
import Settings from './pages/Settings'
import Updates from './pages/Updates'
import { ThemeProvider } from './contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="add" element={<AddApp />} />
            <Route path="edit/:id" element={<EditApp />} />
            {/* Removed presets route */}
            <Route path="updates" element={<Updates />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </ThemeProvider>
  )
}

export default App