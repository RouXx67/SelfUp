import { useState, useEffect } from 'react'
import { FiRefreshCw, FiExternalLink, FiClock, FiPackage } from 'react-icons/fi'
import { updatesApi } from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function Updates() {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadUpdates()
  }, [])

  const loadUpdates = async () => {
    try {
      const response = await updatesApi.getRecent(50)
      setUpdates(response.data)
    } catch (error) {
      toast.error('Erreur lors du chargement des mises à jour')
      console.error('Load updates error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadUpdates()
      toast.success('Mises à jour actualisées')
    } catch (error) {
      toast.error('Erreur lors de l\'actualisation')
    } finally {
      setRefreshing(false)
    }
  }

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: fr 
      })
    } catch {
      return 'Date inconnue'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mises à jour</h1>
        </div>
        
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mises à jour récentes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Historique des mises à jour détectées
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-secondary"
        >
          <FiRefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Updates list */}
      {updates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <FiPackage className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune mise à jour récente
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Les mises à jour détectées apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div key={update.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                {/* App icon */}
                <div className="flex-shrink-0">
                  {update.icon_url ? (
                    <img 
                      src={update.icon_url} 
                      alt={update.app_name}
                      className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl ${update.icon_url ? 'hidden' : 'flex'}`}
                  >
                    📦
                  </div>
                </div>

                {/* Update info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {update.app_name}
                    </h3>
                    <span className="badge badge-warning">Nouvelle version</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">De:</span>
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {update.old_version || 'Inconnue'}
                        </code>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 dark:text-gray-400">Vers:</span>
                        <code className="px-2 py-1 bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-200 rounded text-xs">
                          {update.new_version}
                        </code>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <FiClock className="w-4 h-4" />
                        <span>{formatDate(update.created_at)}</span>
                      </div>
                      
                      {update.notified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Notifié
                        </span>
                      )}
                    </div>

                    {/* Action links */}
                    {update.changelog_url && (
                      <div className="pt-2">
                        <a
                          href={update.changelog_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          <FiExternalLink className="w-4 h-4 mr-1" />
                          Voir les changements
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}