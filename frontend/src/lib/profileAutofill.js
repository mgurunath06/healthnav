import { apiFetch } from './api'

const SEX_VALUES = {
  female: 'female',
  woman: 'female',
  male: 'male',
  man: 'male',
  intersex: 'intersex',
  unknown: 'unknown',
  'prefer not to specify': 'unknown',
}

export async function autofillProfileFromAnswer({
  question,
  answer,
  selectedProfileId,
  getToken,
}) {
  const update = explicitProfileUpdate(question, answer)
  if (!update) return

  try {
    const token = await getToken()
    const profiles = await apiFetch('/profiles', { token })
    const profile = selectedProfileId
      ? profiles.find((item) => item.id === selectedProfileId)
      : profiles.find((item) => item.relation === 'self')

    if (!profile) return

    const missingUpdate = Object.fromEntries(
      Object.entries(update).filter(([key]) => !profile[key]),
    )
    if (Object.keys(missingUpdate).length === 0) return

    await apiFetch(`/profiles/${profile.id}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify(missingUpdate),
    })
  } catch {
    // Profile enrichment must never interrupt the clinical investigation flow.
  }
}

function explicitProfileUpdate(question, answer) {
  const subject = `${question.id ?? ''} ${question.question ?? ''}`.toLowerCase()
  const value = String(answer).trim()

  if (/(date of birth|birth date|when were you born|\bdob\b)/.test(subject)) {
    const date = normaliseDate(value)
    return date ? { date_of_birth: date } : null
  }

  if (/(sex recorded at birth|sex assigned at birth|biological sex)/.test(subject)) {
    const sex = SEX_VALUES[value.toLowerCase()]
    return sex ? { sex } : null
  }

  if (/(full name|name on (your )?medical records)/.test(subject) && value.length <= 100) {
    return { display_name: value }
  }

  return null
}

function normaliseDate(value) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso && isValidDate(value)) return value

  const local = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!local) return null
  const [, day, month, year] = local
  const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return isValidDate(result) ? result : null
}

function isValidDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}
