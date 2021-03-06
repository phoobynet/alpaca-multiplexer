import { Subscription } from './types'

export interface SubscriptionDiff {
  added: Subscription
  removed: Subscription
}

const diffField = (
  field: keyof Subscription,
  o: Subscription,
  n: Subscription,
): [string[], string[]] => {
  const oldField = o[field] || []
  const newField = n[field] || []
  const removed = oldField.filter((x) => !newField.includes(x))
  const added = newField.filter((x) => !oldField.includes(x))

  return [removed, added]
}

/**
 * Produces a deep diff between the old and new subscriptions
 * @param {Subscription} o - the old subscription
 * @param {Subscription} n - the new subscription
 */
export const subscriptionDiff = (
  o: Subscription,
  n: Subscription,
): SubscriptionDiff => {
  const [tradesRemoved, tradesAdded] = diffField('trades', o, n)
  const [quotesRemoved, quotesAdded] = diffField('quotes', o, n)
  const [barsRemoved, barsAdded] = diffField('bars', o, n)
  return {
    added: {
      trades: tradesAdded,
      quotes: quotesAdded,
      bars: barsAdded,
    },
    removed: {
      trades: tradesRemoved,
      quotes: quotesRemoved,
      bars: barsRemoved,
    },
  }
}
