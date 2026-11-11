/** Per-account state the Notifier keeps between poll cycles (counts, poll throttle, notification dedup). */

/**
 * State tied to the Reddit account the poll ran as. Kept in the per-account cache rather than in
 * settings: settings are shared by every Firefox container, so storing it there let one container's
 * account show (and throttle) another account's counts.
 */
export interface NotifierAccountState {
	/** Last known modqueue count, used to render the counter before the next poll. */
	modqueueCount: number
	/** Last known unmoderated count. */
	unmoderatedCount: number
	/** Last known total unread modmail count. */
	modmailCount: number
	/** Last known per-category unread modmail counts. */
	modmailCategoryCount: Record<string, number>
	/** Time (ms) of the last live poll; throttles polls across tabs of the same account. */
	lastChecked: number
	/** Time (ms) of the last unmoderated check; items created after it are notified. */
	lastSeenUnmoderated: number
	/** Fullnames of modqueue items already notified, most recent last. */
	modqueuePushed: string[]
}

/** Values used when an account has no stored state yet. */
export const notifierAccountStateDefaults: NotifierAccountState = {
	modqueueCount: 0,
	unmoderatedCount: 0,
	modmailCount: 0,
	modmailCategoryCount: {highlighted: 0, notifications: 0, archived: 0, new: 0, inprogress: 0, mod: 0,},
	lastChecked: -1,
	lastSeenUnmoderated: -1,
	modqueuePushed: [],
}
