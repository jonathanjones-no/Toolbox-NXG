/** Settings definitions for the Mod View Enhancements module. */
import {defineSettings, type InferSettings,} from '../../framework/module'
import {iconBot,} from './botIcon'

export const settings = defineSettings(
	[
		{
			id: 'subredditColor',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Add a border to items in the queue with color unique to the subreddit name.',
		},
		{
			id: 'subredditColorSalt',
			sharedPolicy: 'populated',
			type: 'text',
			default: 'PJSalt',
			description:
				'Text to randomly change the subreddit color (only applies when subreddit color borders are enabled)',
			advanced: true,
		},
		{
			id: 'subredditColorOverrides',
			type: 'map',
			default: {},
			labels: ['subreddit', 'color (#rrggbb)',],
			description:
				'Override the auto-generated border color for specific subreddits. Enter the subreddit name and a hex color (e.g. #ff0000). Only applies when subreddit color borders are enabled.',
		},
		{
			id: 'highlightNegativePosts',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Highlight posts with a score of 0.',
		},
		{
			id: 'showAutomodActionReason',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description: 'Show the action reason from automoderator below submissions and comments.',
			oldReddit: true,
		},
		{
			id: 'botCheckmark',
			sharedPolicy: 'length',
			type: 'stringlist',
			default: ['AutoModerator',],
			description: 'Make bot approved checkmarks have a different look',
			placeholder: 'Bot username',
			previewImageUrl: iconBot,
			oldReddit: true,
		},
		{
			id: 'highlightAutomodMatches',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description:
				'Highlight words in bot mods report and action reasons which are enclosed in []. Can be used to highlight bot mods regex matches.',
		},
		{
			id: 'highlightAutomodMatchesSubreddit',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description:
				'Also highlight bracketed bot/automod report matches outside the mod queue (e.g. subreddit listings and comment pages, when viewed as a mod). Old Reddit only.',
			oldReddit: true,
		},
		{
			id: 'showSubscriberCount',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description:
				'Show the subscriber count in the subreddit sidebar. Reddit no longer displays it on old Reddit, but still reports it.',
			oldReddit: true,
		},
		{
			id: 'showUserChatLink',
			sharedPolicy: 'raw',
			type: 'boolean',
			// Off by default: each profile visit costs an extra about.json request for the account id.
			default: false,
			description:
				'Show a "start chat" link in the user profile sidebar. Reddit no longer offers one on old Reddit. Looking up the account adds an extra request on each profile you visit, and the link is shown even if the user has chat turned off, since Reddit does not report that setting.',
			oldReddit: true,
		},
	] as const,
)

/** Inferred settings type for the Mod View Enhancements module. */
export type ModViewEnhancementsSettings = InferSettings<typeof settings>
