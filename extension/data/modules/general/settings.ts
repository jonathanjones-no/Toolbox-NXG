/** Settings definitions for the General Settings module, covering appearance, notifications and the context menu. */
import {defineSettings, type InferSettings,} from '../../framework/module'

export const settings = defineSettings(
	[
		{
			id: 'classicTheme',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			advanced: false,
			description:
				'Use the classic look from Toolbox 6.x: square corners, flat shadows, 6.x-style buttons and dark mode',
		},
		{
			id: 'nativeNotifications',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description: 'Display native operating system notifications rather than in-page notifications',
		},
		{
			id: 'timeFormat',
			sharedPolicy: 'raw',
			type: 'selector',
			default: 'relative',
			values: ['Relative', 'Absolute', 'Relative and date',] as const,
			advanced: false,
			description:
				'How Toolbox shows timestamps: relative ("2 years ago"), the date and time, or both ("2 years ago (12.11.2025)")',
		},
		{
			id: 'contextMenuLocation',
			sharedPolicy: 'raw',
			type: 'selector',
			default: 'left',
			values: ['left', 'right',] as const,
			advanced: false,
			description: 'Side of the screen the context menu is shown',
		},
		{
			id: 'contextMenuAttention',
			sharedPolicy: 'raw',
			type: 'selector',
			default: 'open',
			values: ['open', 'fade', 'none',] as const,
			advanced: false,
			description: 'Select what effect the context menu uses to show that new items are available',
		},
		{
			id: 'contextMenuClick',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			advanced: false,
			description: 'Make the context menu only open when you click on it',
		},
	] as const,
)

/** Inferred type of the General Settings object. */
export type GenSettings = InferSettings<typeof settings>
