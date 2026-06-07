import { expect, test } from '@playwright/test'
import { completeProfile, mockApi, seedAuth, selfProfile } from './fixtures'

test('anonymous root opens the public investigation page', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /arrive with the.*right story/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
})

test('login defaults to session-only and reaches the dashboard', async ({ page }) => {
  await mockApi(page)
  await page.goto('/login')

  const remain = page.getByRole('checkbox', { name: /remain logged in/i })
  await expect(remain).not.toBeChecked()
  await page.getByRole('button', { name: /continue with test account/i }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: /good .*test/i })).toBeVisible()
})

test('remembered session sends root visits to the dashboard', async ({ page }) => {
  await seedAuth(page, { remembered: true })
  await mockApi(page)
  await page.goto('/')

  await expect(page).toHaveURL(/\/dashboard$/)
})

test('session-only login is discarded in a fresh browser session', async ({ page }) => {
  await seedAuth(page, { remembered: false })
  await mockApi(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /arrive with the.*right story/i })).toBeVisible()
})

test('incomplete profile does not block the dashboard', async ({ page }) => {
  await seedAuth(page)
  await mockApi(page, { profile: selfProfile })
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: /good .*test/i })).toBeVisible()
  await expect(page.getByText(/complete your health profile/i)).toBeVisible()
})

test('first signed-in investigation offers skippable inline profile setup', async ({ page }) => {
  await seedAuth(page, { promptSeen: false })
  await mockApi(page, { profile: selfProfile })
  await page.goto('/investigate')

  await expect(page.getByRole('heading', { name: /help healthnav ask more relevant questions/i })).toBeVisible()
  await page.getByRole('button', { name: /cancel/i }).click()
  await expect(page.getByRole('heading', { name: /what should we prepare for/i })).toBeVisible()
})

test('later investigations show a reminder instead of blocking setup', async ({ page }) => {
  await seedAuth(page, { promptSeen: true })
  await mockApi(page, { profile: selfProfile })
  await page.goto('/investigate')

  await expect(page.getByText(/complete your health profile for more relevant questions/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: /what should we prepare for/i })).toBeVisible()
})

test('complete profiles show no completion prompt', async ({ page }) => {
  await seedAuth(page)
  await mockApi(page, { profile: completeProfile })
  await page.goto('/dashboard')

  await expect(page.getByText(/complete your health profile/i)).toHaveCount(0)
})
