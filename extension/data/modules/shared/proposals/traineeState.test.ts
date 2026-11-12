/** Tests for warming every moderated sub's trainee set (warmAllTraineeStates). */

// @vitest-environment node
import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

const getModSubs = vi.hoisted(() => vi.fn())
const tryGetConfig = vi.hoisted(() => vi.fn())
const getCurrentUser = vi.hoisted(() => vi.fn(async () => 'aliceTrainee'))
const isModSub = vi.hoisted(() => vi.fn(async () => true))
const getModPermissions = vi.hoisted(() => vi.fn(async (): Promise<string[]> => ['all',]))

vi.mock('../../../api/resources/modSubs', () => ({getModSubs, isModSub,}),)
vi.mock('../../../api/resources/relationships', () => ({
	getModPermissions,
	canEditWiki: (permissions: readonly string[],) => permissions.includes('all',) || permissions.includes('wiki',),
}),)
vi.mock('../../config/moduleapi', () => ({tryGetConfig,}),)
vi.mock('../../../api/resources/me', () => ({getCurrentUser,}),)

import {
	ensureTraineeStateLoaded,
	getTrainingStatus,
	invalidateTraineeState,
	isTraineeAnywhereSync,
	isTraineeFor,
	isTraineeForSync,
	loadCurrentUser,
	resolveProposerName,
	warmAllTraineeStates,
} from './traineeState'

beforeEach(async () => {
	vi.clearAllMocks()
	invalidateTraineeState()
	getModSubs.mockResolvedValue(['sub1', 'sub2',],)
	isModSub.mockResolvedValue(true,)
	getModPermissions.mockResolvedValue(['all',],)
	tryGetConfig.mockImplementation(async (sub: string,) => ({
		status: 'ok',
		config: sub === 'sub1' ? {trainingMods: ['aliceTrainee',],} : {trainingMods: [],},
	}))
	await loadCurrentUser()
},)

afterEach(() => {
	invalidateTraineeState()
},)

describe('warmAllTraineeStates', () => {
	it('warms every moderated sub so the sync check answers for each', async () => {
		await warmAllTraineeStates()
		expect(getModSubs,).toHaveBeenCalledOnce()
		expect(isTraineeForSync('sub1',),).toBe(true,)
		expect(isTraineeForSync('sub2',),).toBe(false,)
	})

	it('coalesces concurrent and repeat calls into a single fan-out', async () => {
		await Promise.all([warmAllTraineeStates(), warmAllTraineeStates(),],)
		await warmAllTraineeStates()
		expect(getModSubs,).toHaveBeenCalledOnce()
	})

	it('re-runs after the trainee state is invalidated', async () => {
		await warmAllTraineeStates()
		invalidateTraineeState()
		await warmAllTraineeStates()
		expect(getModSubs,).toHaveBeenCalledTimes(2,)
	})

	it('skips the viewer\'s own profile pseudo-sub (no config read, no fail-safe trip)', async () => {
		// Reddit lists `u_<username>` (the viewer's own profile) among moderated subs, but it
		// has no toolbox config — warming must not read config for it, which would error and
		// falsely flip isTraineeAnywhereSync via the unreadable backstop.
		getModSubs.mockResolvedValue(['sub2', 'u_aliceTrainee',],)
		await warmAllTraineeStates()
		expect(tryGetConfig,).toHaveBeenCalledTimes(1,)
		expect(tryGetConfig,).toHaveBeenCalledWith('sub2',)
		expect(isTraineeAnywhereSync(),).toBe(false,)
	})
})

describe('resolveProposerName', () => {
	it('awaits the current-user load and returns the resolved name', async () => {
		// The proposals gateway records this as proposedBy; it must reflect the loaded
		// user (not the '' cold value) so a forced second-opinion capture isn't dropped.
		expect(await resolveProposerName(),).toBe('aliceTrainee',)
	})
})

describe('isTraineeAnywhereSync', () => {
	it('is false while cold and true once a sub where the user is a trainee is warm', async () => {
		expect(isTraineeAnywhereSync(),).toBe(false,)
		await ensureTraineeStateLoaded('sub2',) // user is NOT a trainee here
		expect(isTraineeAnywhereSync(),).toBe(false,)
		await ensureTraineeStateLoaded('sub1',) // user IS a trainee here
		expect(isTraineeAnywhereSync(),).toBe(true,)
	})

	it('goes back to false after invalidation clears the warm sets', async () => {
		await warmAllTraineeStates()
		expect(isTraineeAnywhereSync(),).toBe(true,)
		invalidateTraineeState()
		expect(isTraineeAnywhereSync(),).toBe(false,)
	})
})

describe('unreadable config fails open (a bug must never block mod actions)', () => {
	it('treats a read error as "not a trainee" so the action is performed live', async () => {
		tryGetConfig.mockResolvedValue({status: 'error',},)
		expect(await isTraineeFor('sub1',),).toBe(false,)
		expect(isTraineeForSync('sub1',),).toBe(false,)
		expect(isTraineeAnywhereSync(),).toBe(false,)
		expect(await getTrainingStatus('sub1',),).toBe('none',)
	})

	it('treats an unexpected rejection the same way', async () => {
		tryGetConfig.mockRejectedValue(new Error('boom',),)
		expect(await isTraineeFor('sub1',),).toBe(false,)
	})

	it('treats a sub with no config page as "no trainees"', async () => {
		tryGetConfig.mockResolvedValue({status: 'absent',},)
		expect(await isTraineeFor('sub1',),).toBe(false,)
		expect(isTraineeForSync('sub1',),).toBe(false,)
	})

	it('re-attempts the read after an error, picking up a real trainee listing', async () => {
		tryGetConfig.mockResolvedValueOnce({status: 'error',},)
		await ensureTraineeStateLoaded('sub1',)
		expect(isTraineeForSync('sub1',),).toBe(false,)
		tryGetConfig.mockResolvedValue({status: 'ok', config: {trainingMods: ['aliceTrainee',],},},)
		await ensureTraineeStateLoaded('sub1',)
		expect(isTraineeForSync('sub1',),).toBe(true,)
		expect(isTraineeAnywhereSync(),).toBe(true,)
	})
})

describe('moderators without the wiki permission', () => {
	it('reports noWikiAccess when the config is unreadable for lack of wiki permission', async () => {
		getModPermissions.mockResolvedValue(['access', 'mail', 'config', 'posts', 'flair',],)
		tryGetConfig.mockResolvedValue({status: 'error',},)
		expect(await getTrainingStatus('sub1',),).toBe('noWikiAccess',)
		expect(isTraineeForSync('sub1',),).toBe(false,)
	})

	it('reports noWikiAccess on a sub with no config at all', async () => {
		getModPermissions.mockResolvedValue(['posts',],)
		tryGetConfig.mockResolvedValue({status: 'absent',},)
		expect(await getTrainingStatus('sub2',),).toBe('noWikiAccess',)
	})

	it('shows nothing when the permission lookup fails', async () => {
		getModPermissions.mockRejectedValue(new Error('network',),)
		tryGetConfig.mockResolvedValue({status: 'absent',},)
		expect(await getTrainingStatus('sub2',),).toBe('none',)
	})

	it('shows nothing for a non-moderated sub', async () => {
		isModSub.mockResolvedValue(false,)
		tryGetConfig.mockResolvedValue({status: 'absent',},)
		expect(await getTrainingStatus('elsewhere',),).toBe('none',)
	})

	it('reports a listed trainee as trainee', async () => {
		expect(await getTrainingStatus('sub1',),).toBe('trainee',)
	})
})
