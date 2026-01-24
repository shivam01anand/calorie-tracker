const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!

export async function sendSlackMessage(message: string): Promise<boolean> {
  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: message }),
    })
    return response.ok
  } catch (error) {
    console.error('Failed to send Slack message:', error)
    return false
  }
}

export async function sendMissedDayNudge(siteUrl: string): Promise<boolean> {
  const messages = [
    `You didn't log yesterday. 🫠\n\nYou're turning 30. You ran a marathon and can't even track what you eat?\n\nThe body that carried you through 42km deserves better. Log today: ${siteUrl}/log`,
    `No food log yesterday. 😤\n\nYou want that dream body but can't spend 30 seconds logging?\n\nEvery meal untracked is a meal that didn't count toward your goal. Fix it: ${siteUrl}/log`,
    `Missed a day. The streak is broken. 💀\n\nYou know what separates people who get abs from people who don't? Consistency.\n\nGet back on track: ${siteUrl}/log`,
  ]

  const randomMessage = messages[Math.floor(Math.random() * messages.length)]
  return sendSlackMessage(randomMessage)
}

export async function sendWeeklyAnalysisPing(
  highlights: string[],
  missingNutrient: string,
  siteUrl: string
): Promise<boolean> {
  const highlightsText = highlights.slice(0, 2).map(h => `• ${h}`).join('\n')

  const message = `📊 *Weekly nutrition analysis ready.*\n\nQuick hits:\n${highlightsText}\n\n⚠️ Missing: ${missingNutrient}\n\nFull breakdown: ${siteUrl}/insights`

  return sendSlackMessage(message)
}
