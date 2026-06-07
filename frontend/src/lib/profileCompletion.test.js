import { describe, expect, it } from 'vitest'
import { isProfileComplete } from './profileCompletion'

describe('profile completion', () => {
  it('requires a real name, date of birth, and sex', () => {
    expect(isProfileComplete({
      display_name: 'Test User',
      date_of_birth: '1990-06-07',
      sex: 'male',
    })).toBe(true)

    expect(isProfileComplete({
      display_name: 'Me',
      date_of_birth: '1990-06-07',
      sex: 'male',
    })).toBe(false)

    expect(isProfileComplete({
      display_name: 'Test User',
      date_of_birth: null,
      sex: 'male',
    })).toBe(false)
  })
})
