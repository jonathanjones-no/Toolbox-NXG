/** Tests for the restored old Reddit profile sidebar chat link. */

import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

const aboutUser = vi.hoisted(() => vi.fn())
const getCurrentUser = vi.hoisted(() => vi.fn())
const platform = vi.hoisted(() => ({isOldReddit: true,}))

vi.mock('../../../api/resources/users', () => ({aboutUser,}),)
vi.mock('../../../api/resources/me', () => ({getCurrentUser,}),)
vi.mock('../../../util/infra/platform', () => platform,)

import {
	chatUrlForAccount,
	createUserChatLinkHandlers,
	profileUsernameFromPath,
	userChatLinkClass,
} from './userChatLink'

/**
 * Renders an old Reddit user profile sidebar titlebox, mirroring Reddit's markup: the friend toggle
 * wrapped in a plain `<div>`, then a `.bottom` section (whose top border is the divider) holding the
 * "Block user" and crisis-support spacers. `bottom: false` drops that section, `blockUser: false`
 * drops just the block button (as when logged out), and `header` adds the header chat icon.
 */
function renderSidebar ({bottom = true, blockUser = true, header = false,} = {},) {
	const blockSpacer = '<div class="spacer"><form class="toggle block_user-button"><a>Block user</a></form></div>'
	document.body.innerHTML = `
		${header ? '<a id="chat" style="background-image: url(sprite.png); width: 12px; height: 12px;"></a>' : ''}
		<div class="side">
			<div class="titlebox">
				<h1>someuser</h1>
				<div><span class="fancy-toggle-button toggle"></span></div>
				<span class="karma">1</span> post karma
				${
		bottom
			? `<div class="bottom">
						${blockUser ? blockSpacer : ''}
						<div class="spacer"><a class="get-crisis-support">get them help and support</a></div>
						<span class="age">redditor for 1 year</span>
					</div>`
			: ''
	}
			</div>
		</div>
	`
}

/** Lets the pending lookup promise chain settle. */
const flush = () => new Promise((resolve,) => setTimeout(resolve, 0,))

const injected = () => document.querySelector<HTMLAnchorElement>(`.${userChatLinkClass}`,)

beforeEach(() => {
	platform.isOldReddit = true
	history.replaceState(null, '', '/user/someuser/',)
	getCurrentUser.mockReset().mockResolvedValue('modperson',)
	aboutUser.mockReset().mockResolvedValue({kind: 't2', data: {name: 'SomeUser', id: 'abc123',},},)
},)

afterEach(() => {
	document.body.innerHTML = ''
	history.replaceState(null, '', '/',)
},)

describe('profileUsernameFromPath', () => {
	it('reads the username from profile paths and their sub-pages', () => {
		expect(profileUsernameFromPath('/user/some_user-1',),).toBe('some_user-1',)
		expect(profileUsernameFromPath('/user/someuser/comments/',),).toBe('someuser',)
	})

	it('returns null off profile pages', () => {
		expect(profileUsernameFromPath('/r/testsub/',),).toBeNull()
		expect(profileUsernameFromPath('/user/',),).toBeNull()
	})
})

describe('chatUrlForAccount', () => {
	it('builds the chat.reddit.com direct chat URL from the base-36 id', () => {
		expect(chatUrlForAccount('abc123',),).toBe('https://chat.reddit.com/user/t2_abc123',)
	})
})

describe('createUserChatLinkHandlers', () => {
	it('injects a chat link for the profile owner in its own spacer, directly above Block user', async () => {
		renderSidebar()
		createUserChatLinkHandlers(true,)
		await flush()

		expect(aboutUser,).toHaveBeenCalledWith('someuser',)
		const link = injected()
		expect(link?.href,).toBe('https://chat.reddit.com/user/t2_abc123',)
		// Reddit's own chat-link attributes, so its handler opens the native chat window.
		expect(link?.target,).toBe('chat-app',)
		expect(link?.dataset['messageType'],).toBe('navigate.chat',)
		expect(link?.title,).toBe('Start a chat with u/SomeUser',)
		expect(link?.textContent,).toBe('start chat',)
		const spacer = link?.parentElement
		expect(spacer?.classList.contains('spacer',),).toBe(true,)
		expect(spacer?.parentElement?.classList.contains('bottom',),).toBe(true,)
		expect(spacer?.previousElementSibling,).toBeNull()
		expect(spacer?.nextElementSibling?.querySelector('.block_user-button',),).not.toBeNull()
	})

	it('goes first in the bottom section when there is no Block user button', async () => {
		renderSidebar({blockUser: false,},)
		createUserChatLinkHandlers(true,)
		await flush()

		const spacer = injected()?.parentElement
		expect(spacer?.parentElement?.firstElementChild,).toBe(spacer,)
		expect(spacer?.nextElementSibling?.querySelector('.get-crisis-support',),).not.toBeNull()
	})

	it('falls back to after the wrapped friend toggle when there is no bottom section', async () => {
		renderSidebar({bottom: false,},)
		createUserChatLinkHandlers(true,)
		await flush()

		expect(injected()?.previousElementSibling?.querySelector('.fancy-toggle-button',),).not.toBeNull()
	})

	it('copies the header chat icon\'s sprite onto the link', async () => {
		renderSidebar({header: true,},)
		createUserChatLinkHandlers(true,)
		await flush()

		const icon = injected()?.querySelector<HTMLElement>('.toolbox-user-chat-icon',)
		expect(icon?.style.backgroundImage,).toContain('sprite.png',)
		expect(icon?.style.width,).toBe('12px',)
		expect(icon?.getAttribute('aria-hidden',),).toBe('true',)
		// The icon trails the text.
		expect(injected()?.lastChild,).toBe(icon,)
	})

	it('shows a text-only link when the header chat icon is missing', async () => {
		renderSidebar()
		createUserChatLinkHandlers(true,)
		await flush()

		expect(injected()?.querySelector('.toolbox-user-chat-icon',),).toBeNull()
	})

	it('skips the viewer\'s own profile without looking the account up', async () => {
		getCurrentUser.mockResolvedValue('SOMEUSER',)
		renderSidebar()
		createUserChatLinkHandlers(true,)
		await flush()

		expect(aboutUser,).not.toHaveBeenCalled()
		expect(injected(),).toBeNull()
	})

	it('skips suspended accounts', async () => {
		aboutUser.mockResolvedValue({kind: 't2', data: {name: 'someuser', is_suspended: true,},},)
		renderSidebar()
		createUserChatLinkHandlers(true,)
		await flush()

		expect(injected(),).toBeNull()
	})

	it('ignores the stale accept_chats field, which Reddit reports false for accounts that accept chats', async () => {
		aboutUser.mockResolvedValue({kind: 't2', data: {name: 'someuser', id: 'abc123', accept_chats: false,},},)
		renderSidebar()
		createUserChatLinkHandlers(true,)
		await flush()

		expect(injected(),).not.toBeNull()
	})

	it('stays quiet when the account lookup fails', async () => {
		aboutUser.mockRejectedValue(new Error('404',),)
		renderSidebar()
		createUserChatLinkHandlers(true,)
		await flush()

		expect(injected(),).toBeNull()
	})

	it('does nothing when disabled, off old Reddit, or off profile pages', async () => {
		renderSidebar()
		createUserChatLinkHandlers(false,)
		platform.isOldReddit = false
		createUserChatLinkHandlers(true,)
		platform.isOldReddit = true
		history.replaceState(null, '', '/r/testsub/',)
		createUserChatLinkHandlers(true,)
		await flush()

		expect(aboutUser,).not.toHaveBeenCalled()
		expect(injected(),).toBeNull()
	})

	it('removes the link on cleanup and ignores a lookup that resolves after teardown', async () => {
		renderSidebar()
		await createUserChatLinkHandlers(true,).cleanup()
		await flush()
		expect(injected(),).toBeNull()

		const handlers = createUserChatLinkHandlers(true,)
		await flush()
		expect(injected(),).not.toBeNull()
		await handlers.cleanup()
		expect(injected(),).toBeNull()
		// The wrapper spacer goes too, so no empty gap is left above Block user.
		expect(document.querySelector('.bottom',)?.firstElementChild?.querySelector('.block_user-button',),)
			.not.toBeNull()
	})
})
