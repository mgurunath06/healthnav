export function isProfileComplete(profile) {
  return Boolean(
    profile
    && profile.display_name
    && profile.display_name !== 'Me'
    && profile.date_of_birth
    && profile.sex
  )
}
