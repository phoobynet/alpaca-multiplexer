import { BarMessage, Message, QuoteMessage, TradeMessage } from './types'
import { filteredWithRemaining } from './filteredWithRemaining'

export const groupMessages = (
  messages: Message[],
): { trades: TradeMessage[]; quotes: QuoteMessage[]; bars: BarMessage[] } => {
  const [trades, remainingAfterTrades] = filteredWithRemaining(
    messages,
    (message: Message) => message.T === 't',
  )
  const [quotes, remainingAfterQuotes] = filteredWithRemaining(
    remainingAfterTrades,
    (message: Message) => message.T === 'q',
  )
  const [bars] = filteredWithRemaining(
    remainingAfterQuotes,
    (message: Message) => message.T === 'b',
  )

  return {
    trades: trades as TradeMessage[],
    quotes: quotes as QuoteMessage[],
    bars: bars as BarMessage[],
  }
}
