'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import type { Meal } from '@/lib/supabase'

const categories = [
  { value: 'all', label: 'All' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
]

export default function LibraryPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    name_hindi: '',
    recipe_link: '',
    category: 'lunch',
    avg_calories: '',
    avg_protein: '',
    avg_carbs: '',
    avg_fat: '',
  })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchMeals()
  }, [category])

  const fetchMeals = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      if (search) params.set('search', search)

      const response = await fetch(`/api/meals?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMeals(data)
      }
    } catch (error) {
      console.error('Failed to fetch meals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchMeals()
  }

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          avg_calories: parseInt(formData.avg_calories) || 0,
          avg_protein: parseInt(formData.avg_protein) || 0,
          avg_carbs: parseInt(formData.avg_carbs) || 0,
          avg_fat: parseInt(formData.avg_fat) || 0,
        }),
      })

      if (response.ok) {
        setFormData({
          name: '',
          name_hindi: '',
          recipe_link: '',
          category: 'lunch',
          avg_calories: '',
          avg_protein: '',
          avg_carbs: '',
          avg_fat: '',
        })
        setShowAddForm(false)
        fetchMeals()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add meal')
      }
    } catch (error) {
      console.error('Add meal error:', error)
      alert('Something went wrong')
    } finally {
      setAdding(false)
    }
  }

  const filteredMeals = search
    ? meals.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.name_hindi && m.name_hindi.includes(search))
      )
    : meals

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meal Library</h1>
          <p className="text-[var(--muted)] mt-1">Browse and add meals for planning</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add Meal'}
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddMeal}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                placeholder="Chicken Curry"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                Hindi Name
              </label>
              <input
                type="text"
                value={formData.name_hindi}
                onChange={(e) => setFormData({ ...formData, name_hindi: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                placeholder="चिकन करी"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                Recipe Link
              </label>
              <input
                type="url"
                value={formData.recipe_link}
                onChange={(e) => setFormData({ ...formData, recipe_link: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                Calories
              </label>
              <input
                type="number"
                value={formData.avg_calories}
                onChange={(e) => setFormData({ ...formData, avg_calories: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                placeholder="350"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                value={formData.avg_protein}
                onChange={(e) => setFormData({ ...formData, avg_protein: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                placeholder="25"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                value={formData.avg_carbs}
                onChange={(e) => setFormData({ ...formData, avg_carbs: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                value={formData.avg_fat}
                onChange={(e) => setFormData({ ...formData, avg_fat: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
                placeholder="15"
              />
            </div>
          </div>
          <Button type="submit" loading={adding}>
            Add Meal
          </Button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meals..."
            className="w-full px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted)]"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat.value
                  ? 'bg-[var(--accent)] text-[var(--background)]'
                  : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meals Grid */}
      {loading ? (
        <div className="text-center py-12 text-[var(--muted)]">Loading meals...</div>
      ) : filteredMeals.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted)]">
          No meals found. {search && 'Try a different search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeals.map((meal) => (
            <div
              key={meal.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)]/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-medium text-[var(--foreground)]">{meal.name}</h3>
                  {meal.name_hindi && (
                    <p className="text-sm text-[var(--muted)]">{meal.name_hindi}</p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    meal.category === 'breakfast'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : meal.category === 'lunch'
                      ? 'bg-blue-500/20 text-blue-400'
                      : meal.category === 'dinner'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {meal.category}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-[var(--muted)] macro-value">
                <span>{meal.avg_calories} kcal</span>
                <span>{meal.avg_protein}g P</span>
                <span>{meal.avg_carbs}g C</span>
                <span>{meal.avg_fat}g F</span>
              </div>
              {meal.recipe_link && (
                <a
                  href={meal.recipe_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent)] hover:underline mt-2 inline-block"
                >
                  View Recipe →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
