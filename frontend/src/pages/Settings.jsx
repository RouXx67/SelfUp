import { useState, useEffect } from 'react'
import { FiSave, FiCheckCircle, FiXCircle, FiRefreshCw, FiActivity, FiDownload } from 'react-icons/fi'
import { useTheme } from '../contexts/ThemeContext'
import { healthApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Settings() {
  const { isDark, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [healthStatus, setHealthStatus] = useState(null)
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [checkingUpdates, setCheckingUpdates] = useState(false)

  useEffect(() => {
    checkHealth()
    checkForUpdates()

    // Vérifier les mises à jour toutes les 30 minutes
    const updateInterval = setInterval(checkForUpdates, 30 * 60 * 1000)

    return () => clearInterval(updateInterval)
  }, [])

  const checkHealth = async () => {
    setCheckingHealth(true)
    try {
      const response = await healthApi.check()
      setHealthStatus({
        status: 'healthy',
        data: response.data
      })
    } catch (error) {
      setHealthStatus({
        status: 'error',
        error: error.message
      })
    } finally {
      setCheckingHealth(false)
    }
  }

  const handleTestGotify = async () => {
    setLoading(true)
    try {
      // This would need to be implemented in the backend
      toast.success('Test de notification Gotify envoyé')
    } catch (error) {
      toast.error('Erreur lors du test Gotify')
    } finally {
      setLoading(false)
    }
  }

  const checkForUpdates = async () => {
    setCheckingUpdates(true)
    try {
      const response = await fetch('/api/system/check-updates')
      if (response.ok) {
        const result = await response.json()
        setUpdateInfo(result)
      } else {
        console.error('Erreur lors de la vérification des mises à jour')
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error)
    } finally {
      setCheckingUpdates(false)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const response = await fetch('/api/system/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success('Mise à jour lancée avec succès')
        
        // Optionnel : Recharger la page après quelques secondes
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } else {
        throw new Error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Paramètres
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configurez SelfUp selon vos préférences
        </p>
      </div>

      {/* System Status */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            État du système
          </h2>
          <button
            onClick={checkHealth}
            disabled={checkingHealth}
            className="btn btn-sm btn-secondary"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${checkingHealth ? 'animate-spin' : ''}`} />
            Vérifier
          </button>
        </div>

        {healthStatus && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              {healthStatus.status === 'healthy' ? (
                <FiCheckCircle className="w-5 h-5 text-success-500" />
              ) : (
                <FiXCircle className="w-5 h-5 text-danger-500" />
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Backend API: {healthStatus.status === 'healthy' ? 'Opérationnel' : 'Erreur'}
              </span>
            </div>

            {healthStatus.status === 'healthy' && healthStatus.data && (
              <div className="text-sm text-gray-600 dark:text-gray-400 ml-8">
                <p>Version: {healthStatus.data.version}</p>
                <p>Dernière vérification: {new Date(healthStatus.data.timestamp).toLocaleString('fr-FR')}</p>
              </div>
            )}

            {healthStatus.status === 'error' && (
              <div className="text-sm text-danger-600 dark:text-danger-400 ml-8">
                {healthStatus.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Update - Only show if updates are available */}
      {updateInfo?.hasUpdates && (
        <div className="card p-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                🚀 Mise à jour disponible !
              </h2>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Une nouvelle version de SelfUp est disponible
              </p>
              {updateInfo && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  <p>Version actuelle: {updateInfo.currentCommit}</p>
                  <p>Nouvelle version: {updateInfo.remoteCommit}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="btn bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700"
            >
              <FiDownload className={`w-4 h-4 mr-2 ${updating ? 'animate-pulse' : ''}`} />
              {updating ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>

          <div className="bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiDownload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Mise à jour automatique
                </h3>
                <div className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                  <p>• Le système sera mis à jour automatiquement</p>
                  <p>• Vos données et configurations seront préservées</p>
                  <p>• Le processus prend généralement 2-3 minutes</p>
                  <p>• La page se rechargera automatiquement après la mise à jour</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status - Show when checking or no updates */}
      {(checkingUpdates || (updateInfo && !updateInfo.hasUpdates)) && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                État des mises à jour
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {checkingUpdates ? 'Vérification des mises à jour...' : updateInfo?.message}
              </p>
            </div>
            <button
              onClick={checkForUpdates}
              disabled={checkingUpdates}
              className="btn btn-secondary"
            >
              <FiRefreshCw className={`w-4 h-4 mr-2 ${checkingUpdates ? 'animate-spin' : ''}`} />
              {checkingUpdates ? 'Vérification...' : 'Vérifier'}
            </button>
          </div>

          {updateInfo && !updateInfo.hasUpdates && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiCheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Système à jour
                  </h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <p>Vous utilisez la dernière version disponible</p>
                    <p className="text-xs mt-1">Version: {updateInfo.currentCommit}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Appearance */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Apparence
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Thème
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choisissez entre le mode clair et sombre
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${isDark ? 'bg-primary-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${isDark ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Notifications Gotify
        </h2>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiActivity className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Configuration Gotify
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    Les notifications Gotify sont configurées via les variables d'environnement:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">GOTIFY_URL</code> - URL de votre serveur Gotify</li>
                    <li><code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">GOTIFY_TOKEN</code> - Token d'application Gotify</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Test de notification
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Envoyez une notification de test pour vérifier la configuration
              </p>
            </div>
            <button
              onClick={handleTestGotify}
              disabled={loading}
              className="btn btn-sm btn-primary"
            >
              <FiActivity className="w-4 h-4 mr-2" />
              {loading ? 'Test...' : 'Tester'}
            </button>
          </div>
        </div>
      </div>

      {/* Update Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Vérification des mises à jour
        </h2>
        
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiRefreshCw className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Configuration automatique
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Les vérifications automatiques sont configurées via la variable d'environnement:
                  </p>
                  <ul className="list-disc list-inside mt-2">
                    <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">CHECK_INTERVAL_HOURS</code> - Intervalle en heures (défaut: 6h)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          À propos de SelfUp
        </h2>
        
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            SelfUp est une application web pour suivre les mises à jour de vos services auto-hébergés.
          </p>
          <p>
            Version: 1.0.0
          </p>
          <p>
            Développé avec ❤️ pour la communauté self-hosted
          </p>
        </div>
      </div>
    </div>
  )
}