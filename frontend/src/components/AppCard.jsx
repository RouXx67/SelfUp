import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FiExternalLink, 
  FiEdit3, 
  FiTrash2, 
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi'
import { appsApi, updatesApi } from '../services/api'
import toast from 'react-hot-toast'

export default function AppCard({ app, onUpdate, onDelete }) {
  const [isChecking, setIsChecking] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const handleCheck = async (e) => {
    e.stopPropagation()
    setIsChecking(true)
    try {
      const response = await updatesApi.checkSingle(app.id)
      toast.success(`Vérification terminée pour ${app.name}`)
      onUpdate()
    } catch (error) {
      toast.error(`Erreur lors de la vérification de ${app.name}`)
      console.error('Check error:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${app.name} ?`)) {
      try {
        await appsApi.delete(app.id)
        toast.success(`${app.name} supprimé avec succès`)
        onDelete(app.id)
      } catch (error) {
        toast.error(`Erreur lors de la suppression de ${app.name}`)
        console.error('Delete error:', error)
      }
    }
  }

  const handleIgnoreVersion = async (e) => {
    e.stopPropagation()
    if (app.latest_version && window.confirm(`Ignorer la version ${app.latest_version} pour ${app.name} ?`)) {
      try {
        await appsApi.ignoreVersion(app.id, app.latest_version)
        toast.success(`Version ${app.latest_version} ignorée pour ${app.name}`)
        onUpdate()
      } catch (error) {
        toast.error('Erreur lors de l\'ignorage de la version')
        console.error('Ignore version error:', error)
      }
    }
  }

  const handleToggleEnabled = async (e) => {
    e.stopPropagation()
    try {
      await appsApi.update(app.id, { ...app, enabled: !app.enabled })
      toast.success(`${app.name} ${app.enabled ? 'désactivé' : 'activé'}`)
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la modification du statut')
      console.error('Toggle enabled error:', error)
    }
  }

  const getStatusBadge = () => {
    if (!app.enabled) {
      return <span className="badge badge-gray">Désactivé</span>
    }
    
    if (app.hasUpdate && app.latest_version !== app.ignore_version) {
      return <span className="badge badge-warning">Mise à jour disponible</span>
    }
    
    if (app.current_version && app.latest_version) {
      return <span className="badge badge-success">À jour</span>
    }
    
    return <span className="badge badge-gray">Non vérifié</span>
  }

  const getProviderIcon = () => {
    switch (app.provider) {
      case 'github':
        return '🐙'
      case 'dockerhub':
        return '🐳'
      default:
        return '🔗'
    }
  }

  return (
    <div 
      className="card p-6 hover:shadow-md transition-shadow cursor-pointer relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions overlay */}
      {showActions && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
            title="Vérifier les mises à jour"
          >
            <FiRefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleToggleEnabled}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
            title={app.enabled ? 'Désactiver' : 'Activer'}
          >
            {app.enabled ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
          </button>
          
          <Link
            to={`/edit/${app.id}`}
            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
            title="Modifier"
          >
            <FiEdit3 className="w-4 h-4" />
          </Link>
          
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-danger-600 transition-colors"
            title="Supprimer"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* App icon and info */}
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {app.icon_url ? (
            <img 
              src={app.icon_url} 
              alt={app.name}
              className="w-12 h-12 rounded-lg object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div 
            className={`w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-2xl ${app.icon_url ? 'hidden' : 'flex'}`}
          >
            {getProviderIcon()}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {app.name}
            </h3>
            {getStatusBadge()}
          </div>

          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {app.current_version && (
              <div className="flex items-center space-x-2">
                <span>Version actuelle:</span>
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  {app.current_version}
                </code>
              </div>
            )}
            
            {app.latest_version && app.latest_version !== app.current_version && (
              <div className="flex items-center space-x-2">
                <span>Dernière version:</span>
                <code className="px-2 py-1 bg-warning-100 dark:bg-warning-900 text-warning-800 dark:text-warning-200 rounded text-xs">
                  {app.latest_version}
                </code>
                {app.latest_version !== app.ignore_version && (
                  <button
                    onClick={handleIgnoreVersion}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Ignorer cette version"
                  >
                    Ignorer
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center space-x-1">
              <span>Provider:</span>
              <span className="capitalize">{app.provider}</span>
            </div>
          </div>

          {/* Action links */}
          <div className="flex items-center space-x-4 mt-4">
            {app.web_url && (
              <a
                href={app.web_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                onClick={(e) => e.stopPropagation()}
              >
                <FiExternalLink className="w-4 h-4 mr-1" />
                Interface
              </a>
            )}
            
            {app.update_url && (
              <a
                href={app.update_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                onClick={(e) => e.stopPropagation()}
              >
                <FiExternalLink className="w-4 h-4 mr-1" />
                Documentation
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Update indicator */}
      {app.hasUpdate && app.latest_version !== app.ignore_version && app.enabled && (
        <div className="absolute top-2 left-2">
          <div className="w-3 h-3 bg-warning-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  )
}