/** Session-cached lookup of whether the current user holds the wiki permission on a subreddit they moderate. */

import {getCurrentUser,} from '../../api/resources/me'
import {isModSub,} from '../../api/resources/modSubs'
import {canEditWiki, getModPermissions,} from '../../api/resources/relationships'
import createLogger from '../infra/logging'

const log = createLogger('TBWikiAccess',)

/** Resolved answers per subreddit (lowercased); only definite results are cached. */
const resolved = new Map<string, boolean>()
/** In-flight lookups per subreddit (lowercased), so concurrent callers share one request. */
const inFlight = new Map<string, Promise<boolean | undefined>>()

/**
 * Resolves whether the current user may read and edit the mod-only toolbox wiki pages
 * of a subreddit they moderate. Returns `false` only for a moderator positively known to
 * lack the wiki permission (every wiki-backed toolbox feature is unavailable to them);
 * returns `undefined` when they don't moderate the sub or the lookup failed, which
 * callers must treat as "can't tell" and leave features on.
 * @param subreddit The subreddit to check.
 */
export function getWikiAccess (subreddit: string,): Promise<boolean | undefined> {
	const key = subreddit.toLowerCase()
	const cached = resolved.get(key,)
	if (cached !== undefined) { return Promise.resolve(cached,) }
	const pending = inFlight.get(key,)
	if (pending) { return pending }
	const promise = (async () => {
		try {
			const user = await getCurrentUser()
			if (!user || !await isModSub(subreddit,)) { return undefined }
			const canEdit = canEditWiki(await getModPermissions(subreddit, user,),)
			resolved.set(key, canEdit,)
			return canEdit
		} catch (err) {
			log.debug(`could not resolve wiki permission for /r/${subreddit}`, err,)
			return undefined
		} finally {
			inFlight.delete(key,)
		}
	})()
	inFlight.set(key, promise,)
	return promise
}

/**
 * Whether the current user is a moderator of the subreddit positively known to lack the
 * wiki permission. Convenience wrapper over {@link getWikiAccess} for gating UI.
 * @param subreddit The subreddit to check.
 */
export async function lacksWikiAccess (subreddit: string,): Promise<boolean> {
	return await getWikiAccess(subreddit,) === false
}

/**
 * Drops cached answers so the next lookup re-reads the moderator listing.
 * @param subreddit The subreddit to forget, or omit to clear all.
 */
export function clearWikiAccessCache (subreddit?: string,): void {
	if (subreddit === undefined) {
		resolved.clear()
	} else {
		resolved.delete(subreddit.toLowerCase(),)
	}
}
