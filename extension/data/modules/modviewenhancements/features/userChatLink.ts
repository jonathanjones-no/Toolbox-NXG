/** Restores a "start chat" link to old Reddit's user profile sidebar, which Reddit stopped rendering. */

import {getCurrentUser,} from '../../../api/resources/me'
import {aboutUser,} from '../../../api/resources/users'
import {createLifecycle,} from '../../../framework/lifecycle'
import createLogger from '../../../util/infra/logging'
import {isOldReddit,} from '../../../util/infra/platform'

const log = createLogger('ModViewEnhancements',)

/** Class on the injected element; also the marker that stops a second injection. */
export const userChatLinkClass = 'toolbox-user-chat-link'

/**
 * Returns the profile owner's username from an old Reddit `/user/<name>` path, or `null` on any
 * other page. Reddit redirects `/u/<name>` to `/user/<name>`, so only the long form is matched.
 */
export function profileUsernameFromPath (path: string,): string | null {
	return /^\/user\/([\w-]+)/.exec(path,)?.[1] ?? null
}

/**
 * Builds the chat URL Reddit's own chat client uses to open (or start) a direct chat.
 * @param accountId The account's base-36 id without the `t2_` prefix, as `about.json` reports it.
 */
export function chatUrlForAccount (accountId: string,): string {
	return `https://chat.reddit.com/user/t2_${accountId}`
}

/**
 * Builds the sidebar link. It uses the attributes of old Reddit's own chat links so Reddit's
 * delegated `a[target="chat-app"]` click handler (r.matrixChat) opens the conversation in the
 * native pinned chat window instead of navigating. Where that handler isn't loaded (logged out,
 * chat disabled) or the click is modified, the named target reuses a single chat tab.
 */
function buildChatLink (accountId: string, user: string,): HTMLElement {
	const link = document.createElement('a',)
	link.className = userChatLinkClass
	link.href = chatUrlForAccount(accountId,)
	link.target = 'chat-app'
	link.dataset['messageType'] = 'navigate.chat'
	link.rel = 'noopener noreferrer'
	link.title = `Start a chat with u/${user}`
	link.append('start chat',)
	const icon = buildChatIcon()
	if (icon) { link.append(icon,) }
	return link
}

/** Background properties that make up the header chat icon's sprite slice. */
const spriteProperties = [
	'background-image',
	'background-position',
	'background-size',
	'background-repeat',
	'width',
	'height',
] as const

/**
 * Builds a copy of the chat icon from old Reddit's header (`#chat`). The icon is a slice of a
 * sprite sheet whose URL carries a content hash that changes with every Reddit deploy, so its
 * computed styles are copied at runtime instead of hard-coding the sprite (this also keeps the
 * high-DPI variant Reddit picks for the screen). Returns `null` when the header icon isn't on the
 * page, in which case the link is shown as text only.
 */
function buildChatIcon (): HTMLElement | null {
	const headerIcon = document.querySelector('#chat',)
	if (!headerIcon) { return null }
	const computed = getComputedStyle(headerIcon,)
	if (!computed.backgroundImage || computed.backgroundImage === 'none') { return null }
	const icon = document.createElement('span',)
	icon.className = 'toolbox-user-chat-icon'
	icon.setAttribute('aria-hidden', 'true',)
	for (const property of spriteProperties) {
		icon.style.setProperty(property, computed.getPropertyValue(property,),)
	}
	return icon
}

/**
 * Places the link at the top of the profile actions in the titlebox's `.bottom` section (whose top
 * border is the sidebar divider), wrapped in a `.spacer` like its neighbours, so it sits directly
 * above "Block user". Falls back to the start of `.bottom` when there is no block button (logged
 * out), then to after the friend toggle -- which Reddit wraps in a plain `<div>` -- or the heading.
 * @returns The element that was inserted, so cleanup can remove the wrapper with the link.
 */
function insertIntoTitlebox (titlebox: HTMLElement, link: HTMLElement,): HTMLElement {
	const bottom = titlebox.querySelector<HTMLElement>(':scope > .bottom',)
	if (bottom) {
		const spacer = document.createElement('div',)
		spacer.className = 'spacer'
		spacer.append(link,)
		const blockUser = bottom.querySelector(':scope > .spacer:has(.block_user-button)',)
		if (blockUser) {
			blockUser.before(spacer,)
		} else {
			bottom.prepend(spacer,)
		}
		return spacer
	}
	const friendToggle = titlebox.querySelector('.fancy-toggle-button',)
	const anchor = friendToggle?.parentElement === titlebox ? friendToggle : friendToggle?.parentElement
	const heading = titlebox.querySelector(':scope > h1',)
	if (anchor) {
		anchor.after(link,)
	} else if (heading) {
		heading.after(link,)
	} else {
		titlebox.prepend(link,)
	}
	return link
}

/**
 * Looks up the profile owner's account id and adds a "start chat" link to the old Reddit user
 * sidebar. No-op off old Reddit, when disabled, off user profile pages, on the viewer's own profile,
 * and for suspended or deleted accounts (which have no id to chat with).
 *
 * The link is shown whether or not the user accepts chats; Reddit's chat window handles refusals.
 * There is no usable signal: `about.json`'s `accept_chats` reads false for accounts that accept
 * chats, and the new Reddit profile only server-renders its "Start Chat" button for some users
 * when fetched by an extension (it varies the HTML on browser-only navigation headers).
 * @param enabled Whether the user has the chat-link setting on.
 * @returns An object with a `cleanup` function that removes the injected link.
 */
export function createUserChatLinkHandlers (enabled: boolean,): {cleanup: () => Promise<void>} {
	const lifecycle = createLifecycle()
	if (!enabled || !isOldReddit) {
		return {cleanup: lifecycle.cleanup,}
	}

	const username = profileUsernameFromPath(location.pathname,)
	const titlebox = document.querySelector<HTMLElement>('.side .titlebox',)
	if (!username || !titlebox || titlebox.querySelector(`.${userChatLinkClass}`,)) {
		return {cleanup: lifecycle.cleanup,}
	}

	let injected: HTMLElement | null = null
	let disposed = false
	lifecycle.mount(() => {
		disposed = true
		injected?.remove()
		injected = null
	},)

	void (async () => {
		// A failed current-user lookup only means we can't hide the link on our own profile.
		const currentUser = await getCurrentUser().catch(() => '')
		if (disposed || currentUser.toLowerCase() === username.toLowerCase()) { return }
		const {data,} = await aboutUser(username,)
		if (disposed || data.is_suspended || !data.id) { return }
		injected = insertIntoTitlebox(titlebox, buildChatLink(data.id, data.name || username,),)
	})().catch((error: unknown,) => {
		// Deleted and shadowbanned accounts 404 on about.json; a missing link is not worth surfacing.
		log.debug(`Could not load account id for u/${username}`, error,)
	},)

	return {cleanup: lifecycle.cleanup,}
}
