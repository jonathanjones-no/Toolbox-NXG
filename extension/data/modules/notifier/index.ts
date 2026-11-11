/** Registers the Notifier module, which polls Reddit for new modqueue and modmail items and fires browser notifications. */

import {createLifecycle,} from '../../framework/lifecycle'
import {Module,} from '../../framework/module'
import {modbar,} from '../../framework/moduleIds'
import {minutesToMilliseconds,} from '../../util/data/time'
import {isEmbedded,} from '../../util/infra/platform'
import {getModuleSettingAsync,} from '../../util/persistence/settings'
import {getAccountState, setAccountState,} from './moduleapi'
import {createNotifierHandlers, toModmailCategoryCount,} from './poll'
import {type NotifierSettings, settings,} from './settings'

// Always enabled: the poll it runs is the only source of the modbar's queue and
// modmail counters, which must keep updating even when the user has turned
// notifications off. The `showNotifications` setting gates the notifications
// themselves, so switching them off no longer freezes the counters.
export default new Module<NotifierSettings>({
	name: 'Notifier',
	id: 'Notifier',
	docSlug: 'notifier',
	alwaysEnabled: true,
	settings,
}, async function init ({
	showNotifications,
	modNotifications,
	unmoderatedNotifications,
	consolidatedMessages,
	modSubreddits,
	unmoderatedSubreddits,
	checkInterval,
}: NotifierSettings,) {
	if (isEmbedded) {
		return
	}

	const lifecycle = createLifecycle()

	const [unmoderatedOn, modqueueCount, unmoderatedCount, modmailCount, modmailCategoryCount,] = await Promise.all([
		getModuleSettingAsync(modbar, 'unmoderatedOn', true,),
		getAccountState('modqueueCount',),
		getAccountState('unmoderatedCount',),
		getAccountState('modmailCount',),
		getAccountState('modmailCategoryCount',),
	],)
	const checkIntervalMillis = minutesToMilliseconds(checkInterval,)

	const {getmessages, handleCounterUpdate,} = createNotifierHandlers({
		showNotifications,
		modNotifications,
		unmoderatedNotifications,
		consolidatedMessages,
		modSubreddits,
		unmoderatedSubreddits,
		unmoderatedOn,
		checkIntervalMillis,
		modqueueCount,
		unmoderatedCount,
		modmailCount,
		modmailCategoryCount: toModmailCategoryCount(modmailCategoryCount,),
	}, {get: getAccountState, set: setAccountState,},)

	lifecycle.on(window, 'TB_UPDATE_COUNTERS', handleCounterUpdate,)
	lifecycle.interval(() => void getmessages(), checkIntervalMillis,)

	void getmessages()

	return lifecycle.cleanup
},)
