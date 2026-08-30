# FUEL - Personal Calorie Tracker

## Who This Is For

**Shivam, 29.5 years old.**
- About 67kg, 175cm
- Strength trains most days when life allows
- Goal: body recomposition — gradually reduce body-fat percentage while adding visible muscle
- Indian, enjoys both Indian and continental food

---

## The Problem

### Current Reality
- Has a house cook, but life gets busy
- Forgets to tell the cook what to make, ends up eating whatever is made for the family
- Forgets to meal prep
- Doesn't track nutrition currently
- Has tried apps like MyFitnessPal but:
  - Logging is a hassle
  - Forgets to be consistent
  - Falls off the wagon, then days go by before getting back

### Core Friction Points
1. **Logging feels like work** - too many taps, searching databases, guessing portions
2. **Planning and execution are mixed** - thinking about strategy while trying to log kills momentum
3. **No accountability** - when streaks break, nothing pulls you back
4. **Generic apps don't motivate** - bland calorie numbers don't inspire

---

## The Philosophy

### "Notice, don't grade"
- Frame nutrition as **adding good things**, not restricting bad things
- Not about cutting out fatty food, but about achieving what you want
- Indulgent is fine; one meal never becomes a moral verdict
- No scores out of ten, streak shame, or compensatory restriction
- Feedback is validating, loving, playful, specific, and ADHD-friendly

### The Nerd Factor
Shivam wants to know **why** something is good - not generic advice like "eat vegetables." He wants:
- Specific compounds (curcumin, leucine, beta-glucans)
- Mechanisms (inhibits NF-κB pathway, activates mTOR)
- Real-world outcomes (faster recovery, 40% less joint pain, 20% cancer risk reduction)
- The kind of insights that make you think "wow, this is actually strengthening me"

### Separation of Modes
**Execution mode:** Just log. No thinking. No strategy. Brain-dead simple.
**Planning mode:** Decide what to eat for the week. Strategy happens here, separately.

---

## The Solution

### Log Page (Execution Mode)
- Single text box: type what you ate in plain words
- "2 rotis, dal tadka, chicken curry, buttermilk"
- Hit submit → Gemini parses into structured macros
- See calories, protein, carbs, fat
- See nerdy insights with real-world outcomes
- That's it. No decisions. Just log and learn.

### Plan Page (Strategy Mode)
- Weekly calendar view (Mon-Sun)
- Pick meals from a library for breakfast/lunch/dinner
- Library pre-seeded with Indian + continental meals
- Can add your own meals
- Generate a cook card for your cook

### Cook Card
- Shareable meal plan in Hindi/Hinglish
- Screenshot and send on WhatsApp
- "Is hafte ka khaana" - simple, clear instructions

### Meal Library
- 35+ seeded meals (Indian breakfast, lunch, dinner + continental + snacks)
- Each meal has:
  - English name
  - Hindi name (पनीर भुर्जी)
  - Category (breakfast/lunch/dinner/snack)
  - Approximate macros
  - Optional recipe link
- User can add their own meals

### Insights Page
- Weekly AI-generated analysis
- What's missing in your diet (specific nutrients, not generic)
- What's working well
- Specific foods to add with mechanisms and outcomes
- Harsh motivational line about turning 30

### Nudges
- A fresh AI-written Telegram check-in at 11 PM IST
- Accepts messy text and Telegram voice notes
- Tone: warm, curious, varied, and easy for an ADHD brain to answer
- Missing a day creates no debt; the next honest log is always enough

---

## Design Principles

### Sexy, Classy, Premium
This is the most important aspect of life - what food you put in your body. The design should reflect that.

- **Dark theme** - near black background (#0a0a0a)
- **Gold accents** - (#c9a227) for highlights
- **Clean typography** - Geist font family
- **Generous whitespace** - every element earns its place
- **No clutter** - focused, intentional UI

### Mobile-First
Works on phone and laptop. No app store, just a website.

---

## Technical Decisions

| Choice | Why |
|--------|-----|
| Next.js | Fast, modern, easy deployment to Vercel |
| Tailwind CSS | Rapid styling, consistent design system |
| Supabase | Free tier, PostgreSQL, easy setup |
| Gemini API | Parses natural language food logs, generates insights |
| Telegram Bot API | Daily prompts plus text and voice-note logging |
| Slack Webhooks | Weekly chapter in the food channel |
| Vercel | Free hosting, automatic deployments, cron jobs |

---

## Data Model

### food_logs
What you ate, when, parsed macros, AI insights

### meal_library
Catalog of meals you can choose from when planning

### weekly_plans
Your meal plan for each week

### weekly_analysis
AI-generated weekly nutrition analysis

### user_profile
Your stats and goals (single row, just for you)

---

## Success Metrics

For Shivam, success looks like:
1. **Consistency** - logging most days without it feeling like a chore
2. **Awareness** - knowing what you're eating and why it matters
3. **Progress** - moving toward muscle gain goals
4. **Cook coordination** - actually telling the cook what to make each week
5. **Learning** - discovering new foods and their benefits

---

## Future Ideas (Not Built Yet)

- Weight tracking with trend graphs
- Integration with fitness trackers
- Barcode scanning for packaged foods
- AI-suggested meal plans based on what's missing
- Progress photos
- Supplement tracking (CoQ10, probiotics, etc.)
- Recipe suggestions based on available ingredients

---

## URLs

- **Production:** https://calorie-tracker-mocha-two.vercel.app
- **Supabase:** https://supabase.com/dashboard/project/ignlcbjzconvyctjamgb

---

## Running Locally

```bash
cd calorie-tracker
npm install
npm run dev
# Open http://localhost:3000
```

## Deploying

```bash
vercel --prod
```

---

*Built with care. Food, noticed.*
