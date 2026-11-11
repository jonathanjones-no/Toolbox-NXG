/** Tests for when Queue Tools tells the recent-actions table to start expanded. */

import type {ReactElement,} from 'react'
import {beforeEach, describe, expect, it, vi,} from 'vitest'

// The renderer's auto-expand decision is the only thing under test, so the API, DOM and component
// layers (which pull in the store and the webextension polyfill) are stubbed out.
const renderAtLocation = vi.hoisted(() => vi.fn(() => () => {}))
const pageFlags = vi.hoisted(() => ({
	isModpage: null as unknown,
	isShredditModQueuePage: null as unknown,
}))
vi.mock('../../dom/uiLocations', () => ({renderAtLocation,}),)
vi.mock('../../util/reddit/pageContext', () => pageFlags,)
vi.mock('../../api/resources/modSubs', () => ({isModSub: vi.fn(),}),)
vi.mock('../../api/resources/subreddits', () => ({getModLog: vi.fn(),}),)
vi.mock('../../api/resources/things', () => ({getInfo: vi.fn(),}),)
vi.mock('../../dom/oldReddit/page', () => ({getQueueEmptyMessage: vi.fn(), getSiteTable: vi.fn(),}),)
vi.mock('../../util/reddit/thingInfo', () => ({getApiThingInfo: vi.fn(), isInfoRemoved: vi.fn(),}),)
vi.mock('../../util/infra/platform', () => ({isOldReddit: true,}),)
vi.mock('../../util/infra/logging', () => ({default: () => ({debug: vi.fn(), error: vi.fn(),}),}),)
vi.mock('./components/DismissButtonRenderer', () => ({DismissButtonRenderer: vi.fn(),}),)
vi.mock('./components/QueueItemTables', () => ({QueueItemTables: vi.fn(),}),)

import {createQueueHandlers,} from './dom'
import type {QueueToolsSettings,} from './settings'

const context = {thingId: 't3_abc', subreddit: 'somesub',}

/**
 * Registers the handlers with the given expand settings and returns the `autoExpandActions` prop
 * the item-tables renderer produces. No `TBNewPage` is dispatched, mirroring old Reddit, where
 * queue items mount during module init before that event first fires.
 */
function autoExpandFor (
	{expandActionReasonQueue, expandActionReasonEverywhere,}: Pick<
		QueueToolsSettings,
		'expandActionReasonQueue' | 'expandActionReasonEverywhere'
	>,
): unknown {
	renderAtLocation.mockClear()
	createQueueHandlers({
		showRecentActionsOnApproved: true,
		showRecentActionsOnRemoved: true,
		showReportReasons: false,
		queueCreature: 'i have no soul',
		expandActionReasonQueue,
		expandActionReasonEverywhere,
	},)
	const call = renderAtLocation.mock.calls.find((args: unknown[],) => args[0] === 'thingDetails')
	const render = call![2] as unknown as (
		args: {context: typeof context},
	) => ReactElement<{autoExpandActions: boolean}>
	return render({context,},).props.autoExpandActions
}

describe('recent-actions auto-expand', () => {
	beforeEach(() => {
		pageFlags.isModpage = null
		pageFlags.isShredditModQueuePage = null
	},)

	it('expands on an old Reddit queue page without waiting for TBNewPage', () => {
		pageFlags.isModpage = ['/about/modqueue',]
		expect(autoExpandFor({expandActionReasonQueue: true, expandActionReasonEverywhere: false,},),).toBe(true,)
	})

	it('expands on the shreddit mod queue', () => {
		pageFlags.isShredditModQueuePage = ['/mod/queue',]
		expect(autoExpandFor({expandActionReasonQueue: true, expandActionReasonEverywhere: false,},),).toBe(true,)
	})

	it('stays collapsed in a queue when the queue setting is off', () => {
		pageFlags.isModpage = ['/about/modqueue',]
		expect(autoExpandFor({expandActionReasonQueue: false, expandActionReasonEverywhere: false,},),).toBe(false,)
	})

	it('stays collapsed outside queues with only the queue setting on', () => {
		expect(autoExpandFor({expandActionReasonQueue: true, expandActionReasonEverywhere: false,},),).toBe(false,)
	})

	it('expands outside queues when the everywhere setting is on', () => {
		expect(autoExpandFor({expandActionReasonQueue: false, expandActionReasonEverywhere: true,},),).toBe(true,)
	})
})
