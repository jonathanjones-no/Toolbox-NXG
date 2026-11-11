/** Settings definitions and inferred type for the Notifier module. */

import {defineSettings, type InferSettings,} from '../../framework/module'

export const settings = defineSettings(
	[
		{
			id: 'modSubreddits',
			sharedPolicy: 'populated',
			type: 'text',
			default: 'mod',
			advanced: false,
			description: 'Multireddit of subs you want displayed in the modqueue counter',
		},
		{
			id: 'unmoderatedSubreddits',
			sharedPolicy: 'populated',
			type: 'text',
			default: 'mod',
			advanced: false,
			description: 'Multireddit of subs you want displayed in the unmoderated counter',
		},
		{
			id: 'showNotifications',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description: 'Show notifications for new items. Turning this off keeps the modbar counters updating.',
		},
		{
			id: 'consolidatedMessages',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			advanced: true,
			description: 'Consolidate notifications (x new messages) instead of individual notifications',
		},
		{
			id: 'modNotifications',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description: 'Get modqueue notifications',
		},
		{
			id: 'unmoderatedNotifications',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Get unmoderated queue notifications',
		},
		{
			id: 'checkInterval',
			sharedPolicy: 'raw',
			type: 'number',
			default: 1,
			advanced: true,
			description: 'Interval to check for new items (time in minutes).',
		},
	] as const,
)

/** Inferred settings type for the Notifier module. */
export type NotifierSettings = InferSettings<typeof settings>
