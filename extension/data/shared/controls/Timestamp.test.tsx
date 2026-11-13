/** Tests for the timestamp control's response to the time format setting. */

import {renderToStaticMarkup,} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

const settingsValues = vi.hoisted((): Record<string, unknown> => ({}))

vi.mock('../../store', () => ({
	default: {
		getState: () => ({settings: {values: settingsValues,},}),
		subscribe: () => () => {},
	},
}),)

import {absoluteFormat,} from '../../util/data/time'
import {Timestamp,} from './Timestamp'

const date = new Date('2024-01-15T12:00:00Z',)

/** Renders a timestamp under the given stored time format, or with the setting unset. */
function render (format?: string,): string {
	if (format === undefined) {
		delete settingsValues['Toolbox.GenSettings.timeFormat']
	} else {
		settingsValues['Toolbox.GenSettings.timeFormat'] = format
	}
	return renderToStaticMarkup(<Timestamp date={date} />,)
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-01-15T12:00:00Z',),)
},)

afterEach(() => {
	vi.useRealTimers()
},)

describe('Timestamp', () => {
	it('shows relative time when the setting is unset', () => {
		expect(render(),).toContain('>2 years ago</time>',)
	})

	it('shows the date and time when set to absolute', () => {
		const absolute = date.toLocaleString(undefined, absoluteFormat,)
		const html = render('absolute',)
		expect(html,).toContain(`>${absolute}</time>`,)
		expect(html,).toContain('title="2 years ago"',)
	})

	it('appends the date to the relative time when set to both', () => {
		expect(render('relative_and_date',),).toContain(`>2 years ago (${date.toLocaleDateString()})</time>`,)
	})

	it('accepts the display label form of the setting', () => {
		expect(render('Relative and date',),).toContain(`(${date.toLocaleDateString()})`,)
	})
})
