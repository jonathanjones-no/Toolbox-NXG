/** Storage for the Notifier's per-account state, held in the cache namespace of the tab's Reddit session. */

import {notifier,} from '../../framework/moduleIds'
import {getCache, setCache,} from '../../util/persistence/cache'
import {type NotifierAccountState, notifierAccountStateDefaults,} from './schema'

/**
 * Reads one piece of the current account's notifier state.
 * The background resolves the account from the sender tab's session cookie (per Firefox
 * container), so each logged-in account sees only its own counts and throttle.
 * @param key The state field to read.
 */
export function getAccountState<K extends keyof NotifierAccountState,> (key: K,): Promise<NotifierAccountState[K]> {
	return getCache<NotifierAccountState[K]>(notifier, key, notifierAccountStateDefaults[key],)
}

/**
 * Writes one piece of the current account's notifier state.
 * @param key The state field to write.
 * @param value The new value.
 */
export function setAccountState<K extends keyof NotifierAccountState,> (
	key: K,
	value: NotifierAccountState[K],
): Promise<unknown> {
	return setCache(notifier, key, value,)
}
