import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { 
  FiHome, 
  FiPlus, 
  FiSettings, 
  FiBell, 
  FiMenu, 
  FiX,
  FiSun,
  FiMoon,
  FiRefreshCw
} from 'react-icons/fi'
import { useTheme } from '../contexts/ThemeContext'
import { updatesApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Layout() {
  const location = useLocation()
  const { isDark, toggleTheme } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: FiHome },
    { name: 'Ajouter une app', href: '/add', icon: FiPlus },
    { name: 'Mises à jour', href: '/updates', icon: FiBell },
    { name: 'Paramètres', href: '/settings', icon: FiSettings },
  ]

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true)
    try {
      const response = await updatesApi.checkAll()
      const { summary } = response.data
      
      if (summary.updates_found > 0) {
        toast.success(`${summary.updates_found} mise(s) à jour trouvée(s) !`)
      } else {
        toast.success('Toutes les applications sont à jour')
      }
    } catch (error) {
      toast.error('Erreur lors de la vérification des mises à jour')
      console.error('Check updates error:', error)
    } finally {
      setIsCheckingUpdates(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <img src="/selfup-icon.svg" alt="SelfUp" className="w-8 h-8" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">SelfUp</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <item.icon className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'}
                  `} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdates}
              className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
              {isCheckingUpdates ? 'Vérification...' : 'Vérifier'}
            </button>
            
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Suivi des mises à jour de services auto-hébergés
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}