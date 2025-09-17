import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSave, FiArrowLeft, FiHelpCircle, FiRefreshCw } from 'react-icons/fi'
import { appsApi } from '../services/api'
import toast from 'react-hot-toast'

export default function AddApp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [availableVersions, setAvailableVersions] = useState([])
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

  // Fonction pour récupérer les versions disponibles
  const fetchVersions = async () => {
    if (!formData.check_url.trim()) {
      toast.error('Veuillez d\'abord saisir une URL de vérification')
      return
    }

    setLoadingVersions(true)
    try {
      const response = await fetch(`/api/versions/${formData.provider}?url=${encodeURIComponent(formData.check_url)}&limit=20`)
      const data = await response.json()
      
      if (data.success) {
        setAvailableVersions(data.versions)
        toast.success(`${data.versions.length} versions trouvées`)
      } else {
        toast.error(data.message || 'Erreur lors de la récupération des versions')
        setAvailableVersions([])
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
      toast.error('Erreur lors de la récupération des versions')
      setAvailableVersions([])
    } finally {
      setLoadingVersions(false)
    }
  }

  // Effet pour vider les versions quand le provider ou l'URL change
  useEffect(() => {
    setAvailableVersions([])
  }, [formData.provider, formData.check_url])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Ajouter une application</h1>
        </div>
      </div>

      {/* Presets populaires */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Presets populaires</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => handlePresetSelect(preset)}
              className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <img 
                  src={preset.icon_url} 
                  alt={preset.name}
                  className="w-8 h-8 rounded"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
                <div>
                  <div className="font-medium text-gray-900">{preset.name}</div>
                  <div className="text-sm text-gray-500">{preset.provider}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nom */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'application *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Radarr"
              required
            />
          </div>

          {/* Provider */}
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
              Provider
            </label>
            <select
              id="provider"
              name="provider"
              value={formData.provider}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {providers.map(provider => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* URL de vérification */}
        <div>
          <label htmlFor="check_url" className="block text-sm font-medium text-gray-700 mb-2">
            URL de vérification *
          </label>
          <input
            type="url"
            id="check_url"
            name="check_url"
            value={formData.check_url}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={getProviderExample()}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Exemple: {getProviderExample()}
          </p>
        </div>

        {/* Version actuelle avec liste déroulante */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="current_version" className="block text-sm font-medium text-gray-700">
              Version actuelle
            </label>
            <button
              type="button"
              onClick={fetchVersions}
              disabled={loadingVersions || !formData.check_url.trim()}
              className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiRefreshCw className={`w-4 h-4 ${loadingVersions ? 'animate-spin' : ''}`} />
              <span>{loadingVersions ? 'Chargement...' : 'Récupérer les versions'}</span>
            </button>
          </div>
          
          {availableVersions.length > 0 ? (
            <select
              id="current_version"
              name="current_version"
              value={formData.current_version}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionner une version</option>
              {availableVersions.map((version, index) => (
                <option key={index} value={version.version}>
                  {version.version} {version.prerelease ? '(pre-release)' : ''} 
                  {version.releaseDate && ` - ${new Date(version.releaseDate).toLocaleDateString('fr-FR')}`}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              id="current_version"
              name="current_version"
              value={formData.current_version}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 5.2.6.8376 ou laissez vide pour détecter automatiquement"
            />
          )}
          
          {availableVersions.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {availableVersions.length} version(s) disponible(s) trouvée(s)
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* URL de mise à jour */}
          <div>
            <label htmlFor="update_url" className="block text-sm font-medium text-gray-700 mb-2">
              URL de mise à jour
            </label>
            <input
              type="url"
              id="update_url"
              name="update_url"
              value={formData.update_url}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/download"
            />
          </div>

          {/* URL web */}
          <div>
            <label htmlFor="web_url" className="block text-sm font-medium text-gray-700 mb-2">
              URL de l'interface web
            </label>
            <input
              type="url"
              id="web_url"
              name="web_url"
              value={formData.web_url}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="http://localhost:7878"
            />
          </div>
        </div>

        {/* URL de l'icône */}
        <div>
          <label htmlFor="icon_url" className="block text-sm font-medium text-gray-700 mb-2">
            URL de l'icône
          </label>
          <input
            type="url"
            id="icon_url"
            name="icon_url"
            value={formData.icon_url}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/icon.png"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>
        </div>
      </form>

      {/* Aide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FiHelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Conseils :</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Utilisez le bouton "Récupérer les versions" pour charger automatiquement les versions disponibles</li>
              <li>Pour GitHub : utilisez l'URL du repository (ex: https://github.com/owner/repo)</li>
              <li>Pour Docker Hub : utilisez le nom de l'image (ex: linuxserver/radarr)</li>
              <li>L'URL de vérification est utilisée pour détecter les nouvelles versions</li>
              <li>L'URL web permet d'accéder directement à l'interface de l'application</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}