import ensureWalletReady from '../../../data-iframe/blockchainHandler/ensureWalletReady'
import pollForChanges from '../../../data-iframe/blockchainHandler/pollForChanges'
import {
  pollForAccountChange,
  getAccount,
  getAccountBalance,
} from '../../../data-iframe/blockchainHandler/account'

let mockPoll
jest.mock('../../../data-iframe/blockchainHandler/ensureWalletReady', () =>
  jest.fn().mockResolvedValue()
)
jest.mock('../../../data-iframe/blockchainHandler/pollForChanges', () => {
  mockPoll = jest.fn()
  return mockPoll
})
describe('blockchainHandler account handling', () => {
  describe('pollForAccountChange', () => {
    let fakeWalletService
    let fakeWeb3Service
    let onAccountChange

    beforeEach(() => {
      pollForChanges.mockReset()
      fakeWalletService = {
        getAccount: jest.fn(() => 'account'),
      }
      fakeWeb3Service = {
        getAddressBalance: jest.fn(() => '123'),
      }
    })

    it('waits for the wallet to be ready', async () => {
      expect.assertions(1)
      await pollForAccountChange(
        fakeWalletService,
        fakeWeb3Service,
        onAccountChange
      )

      expect(ensureWalletReady).toBeCalled()
    })

    it('polls for account changes', async () => {
      expect.assertions(1)
      await pollForAccountChange(
        fakeWalletService,
        fakeWeb3Service,
        onAccountChange
      )

      expect(pollForChanges).toBeCalled()
    })

    it('getFunc retrieves the current account', async () => {
      expect.assertions(2)
      await pollForAccountChange(
        fakeWalletService,
        fakeWeb3Service,
        onAccountChange
      )

      const value = await pollForChanges.mock.calls[0][0]()
      expect(fakeWalletService.getAccount).toHaveBeenCalled()
      expect(value).toBe('account')
    })

    it('hasValueChanged compares the old to the new account', async () => {
      expect.assertions(2)
      await pollForAccountChange(
        fakeWalletService,
        fakeWeb3Service,
        onAccountChange
      )

      expect(
        await pollForChanges.mock.calls[0][1]('account', 'account')
      ).toBeFalsy() // false = unchanged
      expect(
        await pollForChanges.mock.calls[0][1]('account', 'different account')
      ).toBeTruthy()
    })

    it('changeListener retrieves account balance and sends account and balance to the callback', async done => {
      expect.assertions(4)
      onAccountChange = (account, balance) => {
        expect(account).toBe('new account')
        expect(balance).toBe('123')
        expect(getAccount()).toBe('new account')
        expect(getAccountBalance()).toBe('123')
        done()
      }
      await pollForAccountChange(
        fakeWalletService,
        fakeWeb3Service,
        onAccountChange
      )

      await pollForChanges.mock.calls[0][3]('new account')
    })
  })
})
