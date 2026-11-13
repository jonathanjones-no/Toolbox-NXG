/** Renders a date as relative time, absolute date, or both, following the user's time format setting. */

import {useSyncExternalStore,} from 'react'

import {genSettings,} from '../../framework/moduleIds'
import store from '../../store'
import {selectorOptionKey,} from '../../util/data/string'
import {formatRelativeTime, formatTimestamp, type TimeFormat,} from '../../util/data/time'

const timeFormatKey = `Toolbox.${genSettings}.timeFormat`

/**
 * Reads the time format straight from the store rather than through `useSelector`: timestamps
 * render in many popups and overlays, and not all of them are mounted under a Redux Provider.
 */
function readTimeFormat (): TimeFormat {
	const value = store.getState().settings.values[timeFormatKey]
	const key = typeof value === 'string' ? selectorOptionKey(value,) : ''
	return key === 'absolute' || key === 'relative_and_date' ? key : 'relative'
}

/** Displays a date in the user's chosen time format, with the other form in the hover title. */
export function Timestamp ({date, short = false, className,}: {
	/** Date and time to display */
	date: Date
	/** Use the compact relative form ("3h ago") for tight layouts. */
	short?: boolean
	/** Accepts `undefined` so CSS module lookups (typed `string | undefined`) pass straight through. */
	className?: string | undefined
},) {
	const format = useSyncExternalStore(store.subscribe, readTimeFormat, readTimeFormat,)
	return (
		<time
			className={className}
			dateTime={date.toISOString()}
			title={format === 'absolute' ? formatRelativeTime(date,) : date.toLocaleString()}
		>
			{formatTimestamp(date, format, short,)}
		</time>
	)
}
