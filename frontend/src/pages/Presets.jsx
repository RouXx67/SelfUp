import { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiFilter, FiExternalLink, FiTag, FiDownload } from 'react-icons/fi'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'

export default function Presets() {
  const { isDark } = useTheme()
  const [presets, setPresets] = useState([])
  const [filteredPresets, setFilteredPresets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [applyForm, setApplyForm] = useState({
    customName: '',
    customUrl: '',
    customVersion: ''
  })

  useEffect(() => {
    loadPresets()
    loadCategories()
  }, [])

  useEffect(() => {
    filterPresets()
  }, [presets, searchQuery, selectedCategory])

  const loadPresets = async () => {
    try {
      const response = await fetch('/api/presets')
      const data = await response.json()
      
      if (data.success) {
        setPresets(data.presets)
      } else {
        toast.error('Erreur lors du chargement des presets')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/presets/categories')
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error)
    }
  }

  const filterPresets = () => {
    let filtered = presets

    // Filtrer par recherche
    if (searchQuery) {
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (preset.tags && preset.tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      )
    }

    // Filtrer par catégorie
    if (selectedCategory) {
      filtered = filtered.filter(preset => preset.category === selectedCategory)
    }

    setFilteredPresets(filtered)
  }

  const handleApplyPreset = (preset) => {
    setSelectedPreset(preset)
    setApplyForm({
      customName: preset.name,
      customUrl: preset.web_url,
      customVersion: ''
    })
    setShowApplyModal(true)
  }

  const submitApplyPreset = async () => {
    if (!selectedPreset) return

    try {
      const response = await fetch(`/api/presets/${selectedPreset.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(applyForm)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setShowApplyModal(false)
        setSelectedPreset(null)
        setApplyForm({ customName: '', customUrl: '', customVersion: '' })
      } else {
        toast.error(data.message || 'Erreur lors de l\'application du preset')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur de connexion')
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      'proxy': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'network': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'media': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'notification': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'management': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'monitoring': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'security': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Presets d'Applications
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Ajoutez rapidement des applications populaires avec des configurations pré-définies
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher des presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:w-48">
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
              >
                <option value="">Toutes les catégories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {filteredPresets.length} preset{filteredPresets.length !== 1 ? 's' : ''} trouvé{filteredPresets.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPresets.map(preset => (
          <div key={preset.id} className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img
                  src={preset.icon_url}
                  alt={preset.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/48x48/4F46E5/FFFFFF?text=${preset.name.charAt(0)}`
                  }}
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {preset.name}
                  </h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(preset.category)}`}>
                    {preset.category}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
              {preset.description}
            </p>

            {/* Tags */}
            {preset.tags && preset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {preset.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md"
                  >
                    <FiTag className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {preset.tags.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{preset.tags.length - 3} autres
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleApplyPreset(preset)}
                className="btn btn-primary btn-sm"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Ajouter
              </button>

              {preset.web_url && preset.web_url !== '#' && (
                <a
                  href={preset.web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPresets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <FiSearch className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun preset trouvé
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Essayez de modifier vos critères de recherche ou de filtrage
          </p>
        </div>
      )}

      {/* Apply Preset Modal */}
      {showApplyModal && selectedPreset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Ajouter {selectedPreset.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom de l'application
                </label>
                <input
                  type="text"
                  value={applyForm.customName}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, customName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL Web (optionnel)
                </label>
                <input
                  type="url"
                  value={applyForm.customUrl}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, customUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version actuelle (optionnel)
                </label>
                <input
                  type="text"
                  value={applyForm.customVersion}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, customVersion: e.target.value }))}
                  placeholder="ex: 1.0.0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowApplyModal(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={submitApplyPreset}
                disabled={!applyForm.customName}
                className="btn btn-primary"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}