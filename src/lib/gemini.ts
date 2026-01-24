import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function parseFood(rawInput: string): Promise<{
  meals: { name: string; calories: number; protein: number; carbs: number; fat: number }[]
  total: { calories: number; protein: number; carbs: number; fat: number }
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })

  const prompt = `You are a nutrition expert. Parse this food log into structured data.

Input: "${rawInput}"

Return ONLY valid JSON (no markdown, no code blocks, just raw JSON):
{
  "meals": [
    {"name": "dish name", "calories": 350, "protein": 25, "carbs": 30, "fat": 12}
  ],
  "total": {"calories": 350, "protein": 25, "carbs": 30, "fat": 12}
}

Consider Indian food portions (dal ~150cal, roti ~80cal, rice cup ~200cal, chicken curry ~300cal, etc).
Be accurate but reasonable. If multiple items, sum them for total.`

  const result = await model.generateContent(prompt)
  const response = result.response.text()

  // Clean up response - remove markdown code blocks if present
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleanedResponse)
  } catch {
    // Fallback if parsing fails
    return {
      meals: [{ name: rawInput, calories: 300, protein: 15, carbs: 40, fat: 10 }],
      total: { calories: 300, protein: 15, carbs: 40, fat: 10 }
    }
  }
}

export async function getNerdyInsights(
  meals: { name: string; calories: number; protein: number; carbs: number; fat: number }[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })

  const mealsList = meals.map(m => m.name).join(', ')

  const prompt = `You are a nutrition scientist who explains food benefits in exciting, nerdy detail.

User profile: 29yo male, 69kg, 177cm, goal: muscle gain, loves knowing real-world outcomes

Food eaten today: ${mealsList}

Give 2-3 insights about what they ate. Format each insight as:
**[Compound/Ingredient]** → [mechanism] → [real-world outcome]

Examples of good insights:
- **Curcumin in turmeric** → inhibits NF-κB inflammatory pathway → faster muscle recovery, 40% reduction in post-workout soreness
- **Leucine in chicken** → activates mTOR pathway → triggers muscle protein synthesis, ~25% more efficient than plant proteins
- **Beta-glucans in oats** → fermented by gut bacteria into SCFAs → sustained energy for 4-6 hours, reduced insulin spikes

Be specific with mechanisms and stats when possible. Mention what's great about what they ate.
If something could be added for better results, suggest it briefly.

Tone: excited nerd who genuinely finds this fascinating, not preachy doctor.
Keep it punchy - 3-4 sentences max per insight.`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateWeeklyAnalysis(
  logs: { date: string; parsed_meals: { name: string }[]; total_calories: number; total_protein: number }[]
): Promise<{
  analysis: string
  missing_nutrients: string[]
  recommendations: string[]
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })

  const logsText = logs.map(log =>
    `${log.date}: ${log.parsed_meals.map(m => m.name).join(', ')} (${log.total_calories} cal, ${log.total_protein}g protein)`
  ).join('\n')

  const prompt = `Analyze this week's food logs for a 29yo male (69kg, 177cm) aiming for muscle gain.

Logs:
${logsText}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "analysis": "2-3 paragraph analysis of the week. What's working, what patterns you see, specific mechanisms and real-world outcomes. Be nerdy and specific.",
  "missing_nutrients": ["nutrient1", "nutrient2", "nutrient3"],
  "recommendations": ["specific food + why (mechanism → outcome)", "another specific food + why"]
}

End the analysis with one harsh motivational line about turning 30 and building the dream body.
Be specific. Cite mechanisms. Real-world outcomes only. No generic advice.`

  const result = await model.generateContent(prompt)
  const response = result.response.text()
  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleanedResponse)
  } catch {
    return {
      analysis: response,
      missing_nutrients: [],
      recommendations: []
    }
  }
}
