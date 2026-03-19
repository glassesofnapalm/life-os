/**
 * Claude AI integration for meal plan generation.
 *
 * Your Anthropic API key is stored in localStorage (never sent to any server).
 * Get a key at: https://console.anthropic.com/
 */

import type { MealDay, Recipe } from '@/types'

const KEY_STORAGE = 'anthropic_api_key'

export function getClaudeApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE)
}

export function setClaudeApiKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key.trim())
}

export function clearClaudeApiKey() {
  localStorage.removeItem(KEY_STORAGE)
}

export function isClaudeConfigured(): boolean {
  return !!getClaudeApiKey()
}

/** Call Claude Haiku for fast, cheap generation */
async function callClaude(prompt: string): Promise<string> {
  const apiKey = getClaudeApiKey()
  if (!apiKey) throw new Error('No Anthropic API key configured. Add it in Settings.')

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                   'application/json',
      'x-api-key':                      apiKey,
      'anthropic-version':              '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (resp.status === 401) throw new Error('Invalid API key. Check your Anthropic API key in Settings.')
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Claude API error (${resp.status}): ${err}`)
  }

  const data = await resp.json()
  return data.content?.[0]?.text ?? ''
}

function getWeekDates(): string[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

/** Generate a 7-day meal plan using Claude */
export async function generateMealPlan(calorieTarget: number, preferences: string): Promise<MealDay[]> {
  const dates = getWeekDates()

  const prompt = `Generate a healthy 7-day meal plan with approximately ${calorieTarget} calories per day.
${preferences ? `Dietary preferences/restrictions: ${preferences}` : ''}

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
[
  {
    "date": "${dates[0]}",
    "breakfast": { "id": "b0", "name": "...", "calories": 400, "protein": 20, "carbs": 50, "fat": 12, "prepTime": 10, "servings": 1, "ingredients": ["item 1", "item 2"], "instructions": "..." },
    "lunch":     { "id": "l0", "name": "...", "calories": 550, "protein": 30, "carbs": 60, "fat": 15, "prepTime": 15, "servings": 1, "ingredients": ["item 1"], "instructions": "..." },
    "dinner":    { "id": "d0", "name": "...", "calories": 700, "protein": 40, "carbs": 70, "fat": 20, "prepTime": 25, "servings": 1, "ingredients": ["item 1"], "instructions": "..." },
    "snack":     { "id": "s0", "name": "...", "calories": 200, "protein": 8,  "carbs": 25, "fat": 8,  "prepTime": 5,  "servings": 1, "ingredients": ["item 1"], "instructions": "..." }
  }
]
Generate all 7 days using these dates: ${dates.join(', ')}.
Keep meal names concise. Instructions should be 1-3 sentences. Vary the meals across the week.`

  const raw = await callClaude(prompt)

  // Extract JSON from the response (in case there's any extra text)
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Claude returned unexpected format. Try again.')

  const parsed: MealDay[] = JSON.parse(jsonMatch[0])

  // Validate and coerce
  return parsed.map((day, i) => ({
    date:      day.date || dates[i],
    breakfast: day.breakfast ? coerceRecipe(day.breakfast) : undefined,
    lunch:     day.lunch     ? coerceRecipe(day.lunch)     : undefined,
    dinner:    day.dinner    ? coerceRecipe(day.dinner)    : undefined,
    snack:     day.snack     ? coerceRecipe(day.snack)     : undefined,
  }))
}

export interface DailyBriefingContext {
  date: string
  tasks: { title: string; priority: string }[]
  events: { title: string; start: string }[]
  goals: { title: string; progress: number }[]
  habitStreak: number // longest current streak
}

export async function generateDailyBriefing(ctx: DailyBriefingContext): Promise<string> {
  const prompt = `You are a calm, thoughtful personal assistant. Write a brief morning briefing (3-4 sentences, no lists) for ${ctx.date}.

Context:
- Tasks today: ${ctx.tasks.map(t => t.title).join(', ') || 'none'}
- Events: ${ctx.events.map(e => `${e.title} at ${e.start}`).join(', ') || 'none'}
- Top goals in progress: ${ctx.goals.slice(0, 2).map(g => `${g.title} (${g.progress}%)`).join(', ') || 'none'}
- Current habit streak: ${ctx.habitStreak} day${ctx.habitStreak !== 1 ? 's' : ''}

Tone: warm, grounded, Swedish-minimalist. No bullet points, no headers, no emojis. Just clean prose.
Keep it under 80 words.`

  return callClaude(prompt)
}

function coerceRecipe(r: any): Recipe {
  return {
    id:           r.id || `r_${Math.random().toString(36).slice(2)}`,
    name:         String(r.name || 'Unnamed'),
    calories:     Number(r.calories) || 0,
    protein:      Number(r.protein)  || undefined,
    carbs:        Number(r.carbs)    || undefined,
    fat:          Number(r.fat)      || undefined,
    prepTime:     Number(r.prepTime) || undefined,
    servings:     Number(r.servings) || 1,
    ingredients:  Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
    instructions: String(r.instructions || ''),
  }
}
