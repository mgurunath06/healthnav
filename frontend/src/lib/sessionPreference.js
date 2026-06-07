export const REMAIN_LOGGED_IN_KEY = 'healthnav:remain_logged_in'
export const ACTIVE_BROWSER_SESSION_KEY = 'healthnav:active_browser_session'

export function shouldRemainLoggedIn() {
  return localStorage.getItem(REMAIN_LOGGED_IN_KEY) === 'true'
}
