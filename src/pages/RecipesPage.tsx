import { useState } from 'react'
import { format } from 'date-fns'
import {
  ChefHat, Loader2, UtensilsCrossed, ChevronDown, ChevronRight,
  Settings, RefreshCw,
} from 'lucide-react'
import { useStore, updateMealPlan, setMealDay } from '@/stores/store'
import type { MealDay } from '@/types'
import { isClaudeConfigured, generateMealPlan } from '@/lib/claude'

const MEAL_TYPES: Array<{ key: keyof MealDay; label: string; color: string }> = [
  { key: 'breakfast', label: 'Breakfast', color: 'var(--accent-orange)' },
  { key: 'lunch',     label: 'Lunch',     color: 'var(--accent-blue)'   },
  { key: 'dinner',    label: 'Dinner',    color: 'var(--accent-purple)'  },
  { key: 'snack',     label: 'Snack',     color: 'var(--accent-green)'   },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export default function RecipesPage() {
  const mealPlan = useStore(s => s.mealPlan)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState<string | null>(null)
  const [activeDay, setActiveDay]   = useState(0)
  const [expandedMeal, setExpanded] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const hasKey = isClaudeConfigured()

  const weekDates = getWeekDates()
  const activeDayData = mealPlan.days.find(d => d.date === weekDates[activeDay])

  const totalCalories = activeDayData
    ? MEAL_TYPES.reduce((sum, { key }) => {
        const r = activeDayData[key] as any
        return sum + (r?.calories ?? 0)
      }, 0)
    : 0

  async function handleGenerate() {
    setGenError(null)
    setGenerating(true)
    try {
      const days = await generateMealPlan(mealPlan.calorieTarget, mealPlan.preferences)
      days.forEach(day => setMealDay(day))
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ChefHat size={22} style={{ color: 'var(--accent-pink)' }} />
            <h1 className="heading-xl">Meal Planner</h1>
          </div>
          <p className="body-sm" style={{ color: 'var(--text-tertiary)' }}>
            AI-powered weekly meal plans tailored to your goals
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowConfig(c => !c)}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Settings size={13} /> Settings
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || !hasKey}
            className="btn btn-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: hasKey ? '#1DB954' : 'var(--glass-bg-active)',
              color: hasKey ? '#000' : 'var(--text-tertiary)',
              border: 'none',
              cursor: hasKey && !generating ? 'pointer' : 'not-allowed',
              opacity: generating ? 0.7 : 1,
              fontWeight: 600,
            }}
            title={!hasKey ? 'Add your Claude API key in Settings' : undefined}
          >
            {generating
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <RefreshCw size={14} />}
            {generating ? 'Generating...' : 'Generate Week'}
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <h3 className="heading-sm" style={{ marginBottom: 12 }}>Plan Settings</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Daily Calorie Target</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" min={800} max={5000} step={50}
                  value={mealPlan.calorieTarget}
                  onChange={e => updateMealPlan({ calorieTarget: parseInt(e.target.value) || 2000 })}
                  className="input"
                  style={{ width: 90 }}
                />
                <span className="body-xs">kcal / day</span>
              </div>
            </div>
            <div style={{ flex: 2, minWidth: 220 }}>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Dietary Preferences</label>
              <input
                className="input"
                placeholder="e.g. vegetarian, no nuts, low carb..."
                value={mealPlan.preferences}
                onChange={e => updateMealPlan({ preferences: e.target.value })}
              />
            </div>
          </div>
          {!hasKey && (
            <p className="body-xs" style={{ color: 'var(--accent-orange)', marginTop: 10 }}>
              No Claude API key found. Add it in <a href="/settings" style={{ color: 'var(--accent-blue)' }}>Settings → AI</a>.
            </p>
          )}
        </div>
      )}

      {genError && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-red-glass)', border: '1px solid var(--accent-red)', marginBottom: 16 }}>
          <p className="body-sm" style={{ color: 'var(--accent-red)' }}>{genError}</p>
        </div>
      )}

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {weekDates.map((date, i) => {
          const d = new Date(date + 'T12:00:00')
          const hasMeals = mealPlan.days.some(day => day.date === date)
          const isActive = activeDay === i
          const dayCalories = (() => {
            const dayData = mealPlan.days.find(day => day.date === date)
            if (!dayData) return 0
            return MEAL_TYPES.reduce((sum, { key }) => {
              const r = dayData[key] as any
              return sum + (r?.calories ?? 0)
            }, 0)
          })()
          return (
            <button
              key={date}
              onClick={() => setActiveDay(i)}
              style={{
                flexShrink: 0, textAlign: 'center', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', minWidth: 72,
                border: `1px solid ${isActive ? 'var(--accent-pink)' : hasMeals ? 'var(--glass-border-strong)' : 'var(--glass-border)'}`,
                background: isActive ? 'var(--accent-pink-glass)' : hasMeals ? 'var(--glass-bg-active)' : 'var(--glass-bg)',
                transition: 'all 0.15s',
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isActive ? 'var(--accent-pink)' : 'var(--text-tertiary)', marginBottom: 2 }}>
                {i === 0 ? 'Today' : DAY_NAMES[d.getDay()]}
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: isActive ? 'var(--accent-pink)' : 'var(--text-primary)', lineHeight: 1.2 }}>
                {d.getDate()}
              </p>
              {hasMeals && (
                <p style={{ fontSize: 9, color: isActive ? 'var(--accent-pink)' : 'var(--text-tertiary)', marginTop: 2 }}>
                  {dayCalories} kcal
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Meals for active day */}
      {!activeDayData ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <ChefHat size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px', opacity: 0.4 }} />
          <p className="heading-sm" style={{ marginBottom: 6 }}>No meals planned for this day</p>
          <p className="body-sm">
            {hasKey
              ? 'Click "Generate Week" to create your meal plan with AI.'
              : <>Add your <a href="/settings" style={{ color: 'var(--accent-blue)' }}>Claude API key</a> then generate a plan.</>}
          </p>
        </div>
      ) : (
        <>
          {/* Day summary bar */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '10px 16px', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg-active)', border: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
            <div>
              <span className="body-xs">Total</span>
              <p style={{ fontSize: 15, fontWeight: 700, color: totalCalories > mealPlan.calorieTarget * 1.1 ? 'var(--accent-red)' : 'var(--accent-pink)' }}>
                {totalCalories} kcal
              </p>
            </div>
            <div style={{ width: 1, background: 'var(--glass-border)' }} />
            <div>
              <span className="body-xs">Target</span>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{mealPlan.calorieTarget} kcal</p>
            </div>
            {MEAL_TYPES.map(({ key, label, color }) => {
              const r = activeDayData[key] as any
              if (!r) return null
              return (
                <div key={key}>
                  <span className="body-xs" style={{ color }}>{label}</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.calories} kcal</p>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MEAL_TYPES.map(({ key, label, color }) => {
              const recipe = activeDayData[key] as any
              if (!recipe) return (
                <div key={key} className="glass-card" style={{ padding: '14px 18px', opacity: 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UtensilsCrossed size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="body-sm" style={{ color: 'var(--text-tertiary)' }}>{label} — not planned</span>
                  </div>
                </div>
              )
              const mealKey = `${activeDayData.date}-${key}`
              const isExpanded = expandedMeal === mealKey
              return (
                <div key={key} className="glass-card" style={{ overflow: 'hidden' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}
                    onClick={() => setExpanded(isExpanded ? null : mealKey)}
                  >
                    <div style={{ width: 4, height: 40, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color, marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.name}</p>
                      {recipe.prepTime && (
                        <p className="body-xs" style={{ marginTop: 2 }}>
                          {recipe.prepTime} min · Serves {recipe.servings || 1}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color }}>{recipe.calories}</p>
                      <p className="body-xs">kcal</p>
                      {(recipe.protein || recipe.carbs || recipe.fat) && (
                        <p className="body-xs" style={{ marginTop: 2 }}>P:{recipe.protein}g C:{recipe.carbs}g F:{recipe.fat}g</p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronDown size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                      : <ChevronRight size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--glass-border)' }}>
                      {recipe.ingredients?.length > 0 && (
                        <div style={{ marginTop: 14, marginBottom: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>Ingredients</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 4 }}>
                            {recipe.ingredients.map((ing: string, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                <span className="body-xs">{ing}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {recipe.instructions && (
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>Instructions</p>
                          <p className="body-sm" style={{ lineHeight: 1.6 }}>{recipe.instructions}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
