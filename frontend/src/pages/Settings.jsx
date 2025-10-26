import { useState, useEffect } from 'react'
import { FiRefreshCw, FiDownload, FiCheckCircle, FiXCircle, FiSave, FiSend } from 'react-icons/fi'
import { healthApi } from '../services/api'
import toast from 'react-hot-toast'
import UpdateProgressBar from '../components/UpdateProgressBar'

export default function Settings() {
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [healthStatus, setHealthStatus] = useState(null)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [updateId, setUpdateId] = useState(null)
  const [gotifyLoading, setGotifyLoading] = useState(false)
  const [gotifySaving, setGotifySaving] = useState(false)
  const [gotifyTesting, setGotifyTesting] = useState(false)
  const [gotifyConfig, setGotifyConfig] = useState({ url: '', token: '' })

  useEffect(() => {
    checkHealth()
    checkForUpdates()
    fetchGotifyConfig()
  }, [])

  const checkHealth = async () => {
    setCheckingHealth(true)
    try {
      const response = await healthApi.check()
      setHealthStatus({ status: 'healthy', data: response.data })
    } catch (error) {
      setHealthStatus({ status: 'error', error: error.message })
    } finally {
      setCheckingHealth(false)
    }
  }

  const checkForUpdates = async () => {
    setCheckingUpdates(true)
    try {
      const response = await fetch('/api/system/check-updates')
      const data = await response.json()
      if (data.success) {
        setUpdateInfo(data)
      } else {
        toast.error(data.error || 'Erreur lors de la vérification des mises à jour')
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setCheckingUpdates(false)
    }
  }

  const fetchGotifyConfig = async () => {
    setGotifyLoading(true)
    try {
      const response = await fetch('/api/system/gotify/config')
      const data = await response.json()
      if (data.success) {
        const cfg = data.config || {}
        setGotifyConfig({ url: cfg.url || '', token: '' })
      } else {
        toast.error(data.message || 'Erreur lors du chargement de la configuration Gotify')
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur')
    } finally {
      setGotifyLoading(false)
    }
  }

  const saveGotifyConfig = async () => {
    if (!gotifyConfig.url || !gotifyConfig.token) {
      toast.error('Veuillez renseigner l\'URL et le token Gotify')
      return
    }
    setGotifySaving(true)
    try {
      const response = await fetch('/api/system/gotify/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: gotifyConfig.url, token: gotifyConfig.token })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        toast.success('Configuration Gotify sauvegardée')
        // Nettoyer le champ token pour éviter de l\'afficher en clair
        setGotifyConfig(prev => ({ ...prev, token: '' }))
      } else {
        toast.error(data.message || 'Échec de la sauvegarde de la configuration')
      }
    } catch (error) {
      toast.error(error.message || 'Erreur de connexion au serveur')
    } finally {
      setGotifySaving(false)
    }
  }

  const testGotify = async () => {
    setGotifyTesting(true)
    try {
      const response = await fetch('/api/system/gotify/test', { method: 'POST' })
      const data = await response.json()
      if (response.ok && data.success) {
        toast.success('Notification de test envoyée avec succès')
      } else {
        toast.error(data.message || 'Échec de l\'envoi de la notification de test')
      }
    } catch (error) {
      toast.error(error.message || 'Erreur de connexion au serveur')
    } finally {
      setGotifyTesting(false)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    setUpdateId(null)
    
    try {
      const response = await fetch('/api/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const ok = response.ok
      const result = ok ? await response.json() : null

      if (ok && result?.updateId) {
        const mode = result?.scriptUsed?.includes('lxc')
          ? 'LXC'
          : (result?.scriptUsed?.includes('no_sudo') ? 'sans sudo' : 'standard')
        
        setUpdateId(result.updateId)
        toast.success(`Mise à jour lancée (${mode})`, { duration: 4000 })
      } else {
        let errorMessage = 'Erreur lors du lancement de la mise à jour'
        try {
          const errorData = await response.json()
          if (errorData.message) errorMessage = errorData.message
        } catch {}
        toast.error(errorMessage, { duration: 7000 })
        setUpdating(false)
      }
    } catch (error) {
      toast.error(error.message || 'Erreur de connexion au serveur', { duration: 7000 })
      console.error('Erreur détaillée lors de la mise à jour:', error)
      setUpdating(false)
    }
  }

  const handleUpdateComplete = () => {
    setUpdating(false)
    setUpdateId(null)
    toast.success('Mise à jour terminée avec succès !', { duration: 5000 })
    setTimeout(() => { checkForUpdates() }, 2000)
  }

  const handleUpdateError = (error) => {
    setUpdating(false)
    setUpdateId(null)
    toast.error(`Échec de la mise à jour: ${error}`, { duration: 10000 })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configuration simple, un seul point dupdate</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">État du système</h2>
          <button onClick={checkHealth} disabled={checkingHealth} className="btn btn-sm btn-secondary">
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
              <div className="text-sm text-danger-600 dark:text-danger-400 ml-8">{healthStatus.error}</div>
            )}
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mise à jour SelfUp</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Un seul bouton, pas de réinstallation</p>
          </div>
          <button onClick={checkForUpdates} disabled={checkingUpdates} className="btn btn-secondary">
            <FiRefreshCw className={`w-4 h-4 mr-2 ${checkingUpdates ? 'animate-spin' : ''}`} />
            {checkingUpdates ? 'Vérification...' : 'Vérifier les mises à jour'}
          </button>
        </div>

        {updateInfo?.hasUpdates && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <FiDownload className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">Mise à jour disponible</h3>
                <div className="mt-2 text-xs text-orange-700 dark:text-orange-300 space-y-1">
                  <p>Version actuelle: <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">{updateInfo.currentCommit}</code></p>
                  <p>Nouvelle version: <code className="bg-orange-100 dark:bg-orange-800 px-1 rounded">{updateInfo.remoteCommit}</code></p>
                </div>
                <div className="mt-4">
                  <button onClick={handleUpdate} disabled={updating} className="btn bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700">
                    <FiDownload className={`w-4 h-4 mr-2 ${updating ? 'animate-pulse' : ''}`} />
                    {updating ? 'Mise à jour en cours...' : 'Mettre à jour SelfUp'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barre de progression de mise à jour */}
        {updateId && (
          <div className="mb-4">
            <UpdateProgressBar 
              updateId={updateId}
              onComplete={handleUpdateComplete}
              onError={handleUpdateError}
            />
          </div>
        )}

        {(!updateInfo || !updateInfo.hasUpdates) && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-2">
            <div className="flex">
              <FiCheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Système à jour</h3>
                {updateInfo?.currentCommit && (
                  <p className="text-xs mt-1 text-green-700 dark:text-green-300">Version: <code className="bg-green-100 dark:bg-green-800 px-1 rounded">{updateInfo.currentCommit}</code></p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Le processus est simple et automatique. Vos données restent préservées.
          </div>
        </div>
      </div>

      {/* Section Gotify */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications (Gotify)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configurez l'URL de votre serveur Gotify et le token d'application</p>
          </div>
          <button onClick={fetchGotifyConfig} disabled={gotifyLoading} className="btn btn-sm btn-secondary">
            <FiRefreshCw className={`w-4 h-4 mr-2 ${gotifyLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="gotify_url" className="label">URL du serveur Gotify</label>
            <input
              id="gotify_url"
              type="text"
              className="input"
              placeholder="http://votre-serveur:8080"
              value={gotifyConfig.url}
              onChange={(e) => setGotifyConfig(cfg => ({ ...cfg, url: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="gotify_token" className="label">Token d'application</label>
            <input
              id="gotify_token"
              type="password"
              className="input"
              placeholder="Votre token Gotify"
              value={gotifyConfig.token}
              onChange={(e) => setGotifyConfig(cfg => ({ ...cfg, token: e.target.value }))}
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Le token n'est pas affiché s'il est déjà configuré. Renseignez-le pour le mettre à jour.</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={saveGotifyConfig} disabled={gotifySaving} className="btn btn-primary">
              <FiSave className={`w-4 h-4 mr-2 ${gotifySaving ? 'animate-pulse' : ''}`} />
              {gotifySaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={testGotify} disabled={gotifyTesting || !gotifyConfig.url} className="btn btn-secondary">
              <FiSend className={`w-4 h-4 mr-2 ${gotifyTesting ? 'animate-pulse' : ''}`} />
              {gotifyTesting ? 'Test en cours...' : 'Tester la notification'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">À propos</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">SelfUp  suivez les mises à jour de vos services auto-hébergés.</p>
      </div>
    </div>
  )
}