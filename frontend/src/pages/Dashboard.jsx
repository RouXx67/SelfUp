import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiRefreshCw, FiAlertCircle } from 'react-icons/fi'
import AppCard from '../components/AppCard'
import { appsApi, updatesApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [apps, setApps] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [appsResponse, statsResponse] = await Promise.all([
        appsApi.getAll(),
        updatesApi.getStats()
      ])
      
      setApps(appsResponse.data)
      setStats(statsResponse.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des données')
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadData()
      toast.success('Données actualisées')
    } catch (error) {
      toast.error('Erreur lors de l\'actualisation')
    } finally {
      setRefreshing(false)
    }
  }

  const handleAppUpdate = () => {
    loadData()
  }

  const handleAppDelete = (appId) => {
    setApps(prev => prev.filter(app => app.id !== appId))
    loadData() // Refresh stats
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez vos services auto-hébergés et leurs mises à jour
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          
          <Link to="/add" className="btn btn-primary">
            <FiPlus className="w-4 h-4 mr-2" />
            Ajouter une app
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total des apps
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total_apps}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Apps actives
                </p>
                <p className="text-2xl font-bold text-success-600">
                  {stats.enabled_apps}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Mises à jour disponibles
                </p>
                <p className="text-2xl font-bold text-warning-600">
                  {stats.apps_with_updates}
                </p>
              </div>
              {stats.apps_with_updates > 0 && (
                <FiAlertCircle className="w-5 h-5 text-warning-500" />
              )}
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Dernière vérification
                </p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {stats.last_check ? 
                    new Date(stats.last_check).toLocaleString('fr-FR') : 
                    'Jamais'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apps grid */}
      {apps.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <FiPlus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune application configurée
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Commencez par ajouter votre première application à surveiller.
          </p>
          <Link to="/add" className="btn btn-primary">
            <FiPlus className="w-4 h-4 mr-2" />
            Ajouter une application
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onUpdate={handleAppUpdate}
              onDelete={handleAppDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}