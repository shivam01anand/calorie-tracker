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

export async function sendMissedDayNudge(siteUrl: string, streakBefore: number): Promise<boolean> {
  // Pride + identity-based nudges — reinforce who you're becoming, not what you missed
  const messages =
    streakBefore >= 7
      ? [
          `${streakBefore}-day streak was real. That's not luck — that's discipline.\n\nYesterday broke it. Today decides if it was a slip or a slide.\n\nLog now: ${siteUrl}/log`,
          `${streakBefore} days straight. The version of you that did that is still here.\n\nOne log. Prove it wasn't a fluke: ${siteUrl}/log`,
        ]
      : streakBefore >= 3
        ? [
            `${streakBefore} days logged before yesterday. That's momentum.\n\nThe ADHD brain wants you to quit now. Don't give it the satisfaction.\n\nLog today: ${siteUrl}/log`,
            `You had ${streakBefore} days going. Most people never start.\n\nThe gap between you and the body you want is just this one log: ${siteUrl}/log`,
          ]
        : [
            `Yesterday's empty. Today isn't — yet.\n\nYou don't need a streak to start. You need one log to build one.\n\n30 seconds: ${siteUrl}/log`,
            `No log yesterday. Doesn't matter.\n\nThe man who hits $1M and sculpts his body isn't the one who never missed — he's the one who came back every time.\n\nCome back: ${siteUrl}/log`,
            `Missed a day. The old pattern says skip today too.\n\nBreak the pattern. One log. That's the whole fight: ${siteUrl}/log`,
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
