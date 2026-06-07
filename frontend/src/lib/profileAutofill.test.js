import { describe, expect, it, vi } from 'vitest'
import { autofillProfileFromAnswer, profileUpdateFromAnswer } from './profileAutofill'

function response(data, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  })
}

describe('profile answer autofill', () => {
  it('fills a missing date of birth from an explicit question', async () => {
    expect(profileUpdateFromAnswer(
      { id: 'dob', question: 'What is your date of birth?' },
      '07-06-1990',
    )).toEqual({ date_of_birth: '1990-06-07' })
  })

  it('normalises an explicit sex-at-birth answer', () => {
    expect(profileUpdateFromAnswer(
      { id: 'sex', question: 'What was your sex recorded at birth?' },
      'Female',
    )).toEqual({ sex: 'female' })
  })

  it('never overwrites an existing profile value', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => response([{
        id: 'profile-self',
        relation: 'self',
        display_name: 'Test User',
        date_of_birth: '1985-01-01',
        sex: 'female',
      }]))

    await autofillProfileFromAnswer({
      question: { id: 'sex', question: 'What was your sex recorded at birth?' },
      answer: 'male',
      selectedProfileId: null,
      getToken: async () => 'token',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('ignores demographic-looking symptom text unless the question is explicit', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await autofillProfileFromAnswer({
      question: { id: 'symptom_detail', question: 'Tell us what changed.' },
      answer: 'I am a 42 year old male with a headache',
      selectedProfileId: null,
      getToken: async () => 'token',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
