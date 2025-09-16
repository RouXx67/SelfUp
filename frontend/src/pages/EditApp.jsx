import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiSave, FiArrowLeft, FiHelpCircle } from 'react-icons/fi'
import { appsApi } from '../services/api'
import toast from 'react-hot-toast'

export default function EditApp() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    current_version: '',
    check_url: '',
    update_url: '',
    web_url: '',
    icon_url: '',
    provider: 'github',
    enabled: true
  })

  const providers = [
    { value: 'github', label: 'GitHub Releases', example: 'https://github.com/Radarr/Radarr' },
    { value: 'dockerhub', label: 'Docker Hub', example: 'linuxserver/radarr' },
    { value: 'generic', label: 'API/Web générique', example: 'https://api.example.com/version' }
  ]

  useEffect(() => {
    loadApp()
  }, [id])

  const loadApp = async () => {
    try {
      const response = await appsApi.getById(id)
      const app = response.data
      setFormData({
        name: app.name || '',
        current_version: app.current_version || '',
        check_url: app.check_url || '',
        update_url: app.update_url || '',
        web_url: app.web_url || '',
        icon_url: app.icon_url || '',
        provider: app.provider || 'github',
        enabled: app.enabled !== undefined ? app.enabled : true
      })
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'application')
      console.error('Load app error:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.check_url.trim()) {
      toast.error('Le nom et l\'URL de vérification sont obligatoires')
      return
    }

    setSaving(true)
    try {
      await appsApi.update(id, formData)
      toast.success(`${formData.name} modifié avec succès`)
      navigate('/')
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Une application avec ce nom existe déjà')
      } else {
        toast.error('Erreur lors de la modification de l\'application')
      }
      console.error('Update app error:', error)
    } finally {
      setSaving(false)
    }
  }

  const getProviderExample = () => {
    const provider = providers.find(p => p.value === formData.provider)
    return provider?.example || ''
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="animate-pulse space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Modifier {formData.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Modifiez la configuration de l'application
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Statut de l'application
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formData.enabled ? 'Application active et surveillée' : 'Application désactivée'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="enabled"
              checked={formData.enabled}
              onChange={handleInputChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* Basic info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="label">
              Nom de l'application *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input"
              placeholder="ex: Radarr"
              required
            />
          </div>

          <div>
            <label htmlFor="current_version" className="label">
              Version actuelle
            </label>
            <input
              type="text"
              id="current_version"
              name="current_version"
              value={formData.current_version}
              onChange={handleInputChange}
              className="input"
              placeholder="ex: 4.6.4"
            />
          </div>
        </div>

        {/* Provider */}
        <div>
          <label htmlFor="provider" className="label">
            Provider *
          </label>
          <select
            id="provider"
            name="provider"
            value={formData.provider}
            onChange={handleInputChange}
            className="input"
            required
          >
            {providers.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
          {getProviderExample() && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Exemple: {getProviderExample()}
            </p>
          )}
        </div>

        {/* URLs */}
        <div className="space-y-4">
          <div>
            <label htmlFor="check_url" className="label">
              URL de vérification *
            </label>
            <input
              type="url"
              id="check_url"
              name="check_url"
              value={formData.check_url}
              onChange={handleInputChange}
              className="input"
              placeholder={getProviderExample()}
              required
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              URL utilisée pour vérifier les nouvelles versions
            </p>
          </div>

          <div>
            <label htmlFor="update_url" className="label">
              URL de mise à jour
            </label>
            <input
              type="url"
              id="update_url"
              name="update_url"
              value={formData.update_url}
              onChange={handleInputChange}
              className="input"
              placeholder="https://wiki.servarr.com/radarr/installation"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Lien vers la documentation de mise à jour
            </p>
          </div>

          <div>
            <label htmlFor="web_url" className="label">
              URL de l'interface web
            </label>
            <input
              type="url"
              id="web_url"
              name="web_url"
              value={formData.web_url}
              onChange={handleInputChange}
              className="input"
              placeholder="http://localhost:7878"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Lien vers l'interface web de l'application
            </p>
          </div>

          <div>
            <label htmlFor="icon_url" className="label">
              URL de l'icône
            </label>
            <input
              type="url"
              id="icon_url"
              name="icon_url"
              value={formData.icon_url}
              onChange={handleInputChange}
              className="input"
              placeholder="https://example.com/icon.png"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              URL de l'icône de l'application (optionnel)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <FiHelpCircle className="w-4 h-4 mr-1" />
            Les champs marqués d'un * sont obligatoires
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}