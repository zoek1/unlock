const url = require('../helpers/url')
const dashboard = require('../helpers/dashboard')

const lockName = 'A Lock For an Event'
const lockKeyPrice = '0.1'

describe('Unlock Tickets Homepage', () => {
  beforeAll(async () => {
    await page.goto(url.tickets('/'), { waitUntil: 'networkidle2' })
  })

  it('should load the homepage', async () => {
    expect.assertions(1)
    expect(page).toMatch('Tickets')
  })
})

describe('Unlock Tickets Creation Page', () => {
  beforeAll(async () => {
    await dashboard.deployLock(
      lockName,
      '10' /* days */,
      '1000' /* number of keys */,
      lockKeyPrice
    )

    await page.goto(url.tickets('/create'), { waitUntil: 'networkidle2' })
  })

  it('should allow you to save an event', async () => {
    expect.assertions(5)
    await expect(page).toFill(
      'input[placeholder="Give it a nice name"]',
      'This is my event name'
    )
    await expect(page).toClick('button', { text: 'Save Event' })
    await expect(page).toMatch('Event Saved')
  })
})
