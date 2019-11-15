const Units = require('ethereumjs-units')
const BigNumber = require('bignumber.js')
const Web3Utils = require('web3-utils')
const deployLocks = require('../helpers/deployLocks')
const shouldFail = require('../helpers/shouldFail')

const unlockContract = artifacts.require('Unlock.sol')
const getProxy = require('../helpers/proxy')

let lock

contract('Lock / shareKeyFromVsId', accounts => {
  const keyOwners = [accounts[1], accounts[2], accounts[3]]
  const keyPrice = new BigNumber(Units.convert(0.01, 'eth', 'wei'))

  before(async () => {
    const unlock = await getProxy(unlockContract)
    const locks = await deployLocks(unlock, accounts[0])
    lock = locks['FIRST']
    const purchases = keyOwners.map(account => {
      return lock.purchase(0, account, web3.utils.padLeft(0, 40), [], {
        value: keyPrice.toFixed(),
        from: account,
      })
    })
    await Promise.all(purchases)

    // Change the fee to 5%
    await lock.updateTransferFee(500)
  })

  it('error', async () => {
    await lock.approve(keyOwners[0], await lock.getTokenIdFor(keyOwners[2]), {
      from: keyOwners[2],
    })
    await lock.shareKey(
      keyOwners[0],
      keyOwners[1],
      await lock.getTokenIdFor(keyOwners[2]),
      new BigNumber('10000000000000000000000'),
      {
        from: keyOwners[0],
      }
    )
    // emits ExpireKey(tokenId: 3) but "event decoding failed" -- not sure why
    assert.equal(await lock.ownerOf(3), keyOwners[2])
    assert.equal(await lock.getHasValidKey(keyOwners[2]), true) // error should be false. event says this should be false
    assert.equal(await lock.ownerOf(1), keyOwners[0])
    assert.equal(await lock.getHasValidKey(keyOwners[0]), false) // error should be true. we were transferring ID 3, not 0.
  })
})
