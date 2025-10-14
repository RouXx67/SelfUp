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
  const [gotifyConfig, setGotifyConfig] = useState({
    url: '',
    token: '',
    enabled: false,
    hasToken: false
  })
  const [gotifyLoading, setGotifyLoading] = useState(false)

  useEffect(() => {
    checkHealth()
    checkForUpdates()
    loadGotifyConfig()

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
      const response = await fetch('/api/system/gotify/test', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('Notification de test envoyée !')
      } else {
        toast.error(data.message || 'Erreur lors du test')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const checkForUpdates = async () => {
    setCheckingUpdates(true)
    try {
      const response = await fetch('/api/system/check-updates')
      const data = await response.json()
      
      if (data.success) {
        setUpdateInfo(data)
        if (data.hasUpdates) {
          toast.success(`Mise à jour disponible: ${data.currentCommit} → ${data.remoteCommit}`)
        } else {
          toast.success('Système à jour')
        }
      } else {
        toast.error(`Erreur: ${data.error}`)
        console.error('Update check error:', data.error)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur de connexion au serveur')
    } finally {
      setCheckingUpdates(false)
    }
  }

  const loadGotifyConfig = async () => {
    try {
      const response = await fetch('/api/system/gotify/config')
      const data = await response.json()
      
      if (data.success) {
        setGotifyConfig(prev => ({
          ...prev,
          enabled: data.config.enabled,
          hasToken: data.config.hasToken,
          url: data.config.url || ''
        }))
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la config Gotify:', error)
    }
  }

  const saveGotifyConfig = async () => {
    if (!gotifyConfig.url || !gotifyConfig.token) {
      toast.error('URL et token sont requis')
      return
    }

    setGotifyLoading(true)
    try {
      const response = await fetch('/api/system/gotify/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: gotifyConfig.url,
          token: gotifyConfig.token
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Configuration Gotify sauvegardée')
        loadGotifyConfig() // Recharger la config
      } else {
        toast.error(data.message || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur de connexion')
    } finally {
      setGotifyLoading(false)
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
        
        // Afficher des informations détaillées sur la mise à jour
        if (result.containerId && result.installPath) {
          toast.success(`Mise à jour lancée avec succès\nConteneur: ${result.containerId}\nChemin: ${result.installPath}`, {
            duration: 5000
          })
        } else {
          toast.success('Mise à jour lancée avec succès')
        }
        
        // Optionnel : Recharger la page après quelques secondes
        setTimeout(() => {
          window.location.reload()
        }, 5000) // Augmenté à 5 secondes pour laisser le temps de lire le message
      } else {
        // Récupérer le message d'erreur détaillé du serveur
        let errorMessage = 'Erreur lors de la mise à jour'
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          }
        } catch (e) {
          // Si on ne peut pas parser la réponse JSON, utiliser le status
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }
        
        toast.error(errorMessage, {
          duration: 8000 // Message d'erreur affiché plus longtemps
        })
        throw new Error(errorMessage)
      }
    } catch (error) {
      // Gestion d'erreur améliorée avec différents types d'erreurs
      let errorMessage = 'Erreur lors de la mise à jour'
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.'
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion internet.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, {
        duration: 8000
      })
      
      console.error('Erreur détaillée lors de la mise à jour:', error)
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

      {/* System Updates */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mises à jour du système
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Vérifiez et installez les mises à jour de SelfUp
            </p>
          </div>
          <button
            onClick={checkForUpdates}
            disabled={checkingUpdates}
            className="btn btn-secondary"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${checkingUpdates ? 'animate-spin' : ''}`} />
            {checkingUpdates ? 'Vérification...' : 'Vérifier les mises à jour'}
          </button>
        </div>

        {/* Update available */}
        {updateInfo?.hasUpdates && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FiDownload className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  🚀 Mise à jour disponible !
                </h3>
                <div className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                  <p>Une nouvelle version de SelfUp est disponible</p>
                  {updateInfo && (
                    <div className="text-xs mt-2 space-y-1">
                      <p>Version actuelle: <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">{updateInfo.currentCommit}</code></p>
                      <p>Nouvelle version: <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">{updateInfo.remoteCommit}</code></p>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="btn bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700"
                  >
                    <FiDownload className={`w-4 h-4 mr-2 ${updating ? 'animate-pulse' : ''}`} />
                    {updating ? 'Mise à jour en cours...' : 'Installer la mise à jour'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No updates available */}
        {updateInfo && !updateInfo.hasUpdates && !checkingUpdates && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
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
                  <p className="text-xs mt-1">Version: <code className="bg-green-100 dark:bg-green-800 px-1 rounded">{updateInfo.currentCommit}</code></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Checking updates */}
        {checkingUpdates && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiRefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Vérification en cours...
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>Recherche de nouvelles versions disponibles</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update process info */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiActivity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Processus de mise à jour
              </h3>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <ul className="list-disc list-inside space-y-1">
                  <li>Le système sera mis à jour automatiquement</li>
                  <li>Vos données et configurations seront préservées</li>
                  <li>Le processus prend généralement 2-3 minutes</li>
                  <li>La page se rechargera automatiquement après la mise à jour</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

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
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiActivity className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Configuration Gotify
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Configurez votre serveur Gotify pour recevoir des notifications.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="gotify-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL du serveur Gotify
              </label>
              <input
                id="gotify-url"
                type="url"
                value={gotifyConfig.url}
                onChange={(e) => setGotifyConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://gotify.example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="gotify-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Token d'application
              </label>
              <input
                id="gotify-token"
                type="password"
                value={gotifyConfig.token}
                onChange={(e) => setGotifyConfig(prev => ({ ...prev, token: e.target.value }))}
                placeholder="Votre token d'application Gotify"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={saveGotifyConfig}
                disabled={gotifyLoading || !gotifyConfig.url || !gotifyConfig.token}
                className="btn btn-primary"
              >
                <FiSave className="w-4 h-4 mr-2" />
                {gotifyLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>

              {gotifyConfig.enabled && (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <FiCheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Configuré</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
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
              disabled={loading || !gotifyConfig.enabled}
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