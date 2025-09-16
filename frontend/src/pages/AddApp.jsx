import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSave, FiArrowLeft, FiHelpCircle } from 'react-icons/fi'
import { appsApi } from '../services/api'
import toast from 'react-hot-toast'

export default function AddApp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    current_version: '',
    check_url: '',
    update_url: '',
    web_url: '',
    icon_url: '',
    provider: 'github'
  })

  const providers = [
    { value: 'github', label: 'GitHub Releases', example: 'https://github.com/Radarr/Radarr' },
    { value: 'dockerhub', label: 'Docker Hub', example: 'linuxserver/radarr' },
    { value: 'generic', label: 'API/Web générique', example: 'https://api.example.com/version' }
  ]

  const presets = [
    {
      name: 'Radarr',
      current_version: '',
      check_url: 'https://api.github.com/repos/Radarr/Radarr/releases/latest',
      update_url: 'https://wiki.servarr.com/radarr/installation',
      web_url: '',
      icon_url: 'https://raw.githubusercontent.com/Radarr/Radarr/develop/Logo/256.png',
      provider: 'github'
    },
    {
      name: 'Sonarr',
      current_version: '',
      check_url: 'https://api.github.com/repos/Sonarr/Sonarr/releases/latest',
      update_url: 'https://wiki.servarr.com/sonarr/installation',
      web_url: '',
      icon_url: 'https://raw.githubusercontent.com/Sonarr/Sonarr/develop/Logo/256.png',
      provider: 'github'
    },
    {
      name: 'Prowlarr',
      current_version: '',
      check_url: 'https://api.github.com/repos/Prowlarr/Prowlarr/releases/latest',
      update_url: 'https://wiki.servarr.com/prowlarr/installation',
      web_url: '',
      icon_url: 'https://raw.githubusercontent.com/Prowlarr/Prowlarr/develop/Logo/256.png',
      provider: 'github'
    }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePresetSelect = (preset) => {
    setFormData(preset)
    toast.success(`Preset ${preset.name} appliqué`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.check_url.trim()) {
      toast.error('Le nom et l\'URL de vérification sont obligatoires')
      return
    }

    setLoading(true)
    try {
      await appsApi.create(formData)
      toast.success(`${formData.name} ajouté avec succès`)
      navigate('/')
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Une application avec ce nom existe déjà')
      } else {
        toast.error('Erreur lors de l\'ajout de l\'application')
      }
      console.error('Add app error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProviderExample = () => {
    const provider = providers.find(p => p.value === formData.provider)
    return provider?.example || ''
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
            Ajouter une application
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configurez une nouvelle application à surveiller
          </p>
        </div>
      </div>

      {/* Presets */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Presets populaires
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetSelect(preset)}
              className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {preset.icon_url && (
                  <img 
                    src={preset.icon_url} 
                    alt={preset.name}
                    className="w-8 h-8 rounded"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <span className="font-medium text-gray-900 dark:text-white">
                  {preset.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
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
              disabled={loading}
              className="btn btn-primary"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}