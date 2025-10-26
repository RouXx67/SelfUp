import { useState, useEffect } from 'react'
import { FiLoader, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi'

export default function UpdateProgressBar({ updateId, onComplete, onError }) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('starting') // starting, running, completed, failed
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!updateId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/system/update/logs/${updateId}`)
        const data = await response.json()

        if (data.success) {
          setLogs(data.logs || [])
          
          // Calculer le progrès basé sur les logs
          const logCount = data.logs?.length || 0
          const estimatedProgress = Math.min((logCount / 20) * 100, 90) // Max 90% pendant l'exécution
          
          if (data.completed) {
            setProgress(100)
            setStatus(data.exitCode === 0 ? 'completed' : 'failed')
            
            if (data.exitCode === 0) {
              onComplete?.()
            } else {
              // Utiliser les lignes d'erreur filtrées ou les dernières lignes
              const errorMsg = data.errorLines?.length > 0 
                ? data.errorLines.join('\n')
                : data.logs?.slice(-5).join('\n') || 'Erreur inconnue'
              setError(errorMsg)
              onError?.(errorMsg)
            }
            
            clearInterval(pollInterval)
          } else {
            setProgress(estimatedProgress)
            setStatus('running')
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des logs:', err)
        setError('Erreur de communication avec le serveur')
        setStatus('failed')
        onError?.('Erreur de communication avec le serveur')
        clearInterval(pollInterval)
      }
    }, 2000) // Poll toutes les 2 secondes

    return () => clearInterval(pollInterval)
  }, [updateId, onComplete, onError])

  const getStatusIcon = () => {
    switch (status) {
      case 'starting':
      case 'running':
        return <FiLoader className="w-5 h-5 animate-spin text-blue-500" />
      case 'completed':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <FiXCircle className="w-5 h-5 text-red-500" />
      default:
        return <FiAlertTriangle className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'starting':
        return 'Initialisation de la mise à jour...'
      case 'running':
        return 'Mise à jour en cours...'
      case 'completed':
        return 'Mise à jour terminée avec succès'
      case 'failed':
        return 'Échec de la mise à jour'
      default:
        return 'État inconnu'
    }
  }

  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  if (!updateId) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      {/* En-tête avec statut */}
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {getStatusText()}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(progress)}% terminé
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Logs en temps réel */}
      {logs.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 max-h-40 overflow-y-auto">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Logs de mise à jour :
          </h4>
          <div className="space-y-1">
            {logs.slice(-10).map((log, index) => (
              <div key={index} className="text-xs font-mono text-gray-600 dark:text-gray-400">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Affichage des erreurs */}
      {error && status === 'failed' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <div className="flex items-start">
            <FiXCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="ml-2">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                Erreur de mise à jour
              </h4>
              <div className="mt-1 text-xs text-red-700 dark:text-red-300">
                <pre className="whitespace-pre-wrap font-mono">{error}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message de succès */}
      {status === 'completed' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
          <div className="flex items-center">
            <FiCheckCircle className="w-4 h-4 text-green-500" />
            <p className="ml-2 text-sm text-green-800 dark:text-green-200">
              La mise à jour a été appliquée avec succès. Le service va redémarrer automatiquement.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}