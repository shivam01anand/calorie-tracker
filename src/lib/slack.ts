import type { WeeklyCoachReport } from './gemini'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export async function sendSlackMessage(message: string): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) return false
  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    })
    return response.ok
  } catch (error) {
    console.error('Failed to send Slack message:', error)
    return false
  }
}

export async function sendWeeklyCoachReport(
  report: WeeklyCoachReport,
  stats: { loggedDays: number; proteinDays: number },
  siteUrl: string
): Promise<boolean> {
  const wins = report.wins.slice(0, 3).map((win) => `• ${win}`).join('\n')
  const message = `🌿 *${report.title}*
_${report.opening}_

*The receipts*
${wins}

*The pattern worth noticing*
${report.pattern}

*Next week’s tiny experiment*
${report.experiment}

${stats.loggedDays} days noticed · protein floor reached ${stats.proteinDays} times

${report.closing}
<${siteUrl}/insights|Open the full week →>`
  return sendSlackMessage(message)
}

export async function sendMissedDayNudge(siteUrl: string): Promise<boolean> {
  return sendSlackMessage(`No guilt, no reset button. Today is still open. Log one honest line: ${siteUrl}/log`)
}
