import { describe, expect, it } from 'vitest'
import { REMAIN_LOGGED_IN_KEY, shouldRemainLoggedIn } from './sessionPreference'

describe('session preference', () => {
  it('defaults to session-only access', () => {
    expect(shouldRemainLoggedIn()).toBe(false)
  })

  it('recognises an explicit remembered-session choice', () => {
    localStorage.setItem(REMAIN_LOGGED_IN_KEY, 'true')
    expect(shouldRemainLoggedIn()).toBe(true)
  })
})
