const Units = require('ethereumjs-units')
const Web3Utils = require('web3-utils')
const { TestHelper } = require('@openzeppelin/cli')
const { ZWeb3, Contracts } = require('@openzeppelin/upgrades')

ZWeb3.initialize(web3.currentProvider)
const UnlockV4 = Contracts.getFromNodeModules('unlock-abi-1-1', '../../Unlock')
const PublicLockV4 = require('unlock-abi-1-1/PublicLock')

let project, proxy, unlock

contract('Unlock / upgrades', accounts => {
  const unlockOwner = accounts[9]
  const lockOwner = accounts[1]
  const keyOwner = accounts[2]
  const keyOwner3 = accounts[3]
  const keyOwner4 = accounts[4]
  const keyOwner5 = accounts[5]
  const keyPrice = Units.convert('0.01', 'eth', 'wei')
  let lockV4

  before(async () => {
    project = await TestHelper({ from: unlockOwner })

    // Deploy
    UnlockV4.schema.contractName = 'UnlockV4'
    proxy = await project.createProxy(UnlockV4, {
      UnlockV4,
      initMethod: 'initialize',
      initArgs: [unlockOwner],
    })

    unlock = await UnlockV4.at(proxy.address)

    // Create Lock
    const lockTx = await unlock.methods
      .createLock(
        60 * 60 * 24, // expirationDuration 1 day
        Web3Utils.padLeft(0, 40), // token address
        keyPrice,
        5, // maxNumberOfKeys
        'UpgradeTestingLock'
      )
      .send({ from: lockOwner, gas: 6000000 })
    // THIS API IS LIKELY TO BREAK BECAUSE IT ASSUMES SO MUCH
    const evt = lockTx.events.NewLock
    lockV4 = new web3.eth.Contract(
      PublicLockV4.abi,
      evt.returnValues.newLockAddress
    )

    // Buy Key
    await lockV4.methods.purchaseFor(keyOwner).send({
      value: keyPrice,
      from: keyOwner,
      gas: 4000000,
    })
  })

  describe('Purchases', () => {
    it('should still have the same tokenId after expiration', async () => {
      await lockV4.methods.expireKeyFor(keyOwner).send({
        from: lockOwner,
      })
      let hasValidKey = await lockV4.methods.getHasValidKey(keyOwner).call()
      let isKeyOwner = await lockV4.methods.isKeyOwner(1, keyOwner).call()
      assert.equal(hasValidKey, false) // keyOwner's key is no longer valid
      assert.equal(isKeyOwner, true) // keyOwner is still considered to be the owner of the key with the tokenId "1"
    })

    it('purchasing another key should not change the tokenId', async () => {
      await lockV4.methods.purchaseFor(keyOwner).send({
        value: keyPrice,
        from: keyOwner,
        gas: 4000000,
      })
      let tokenId = await lockV4.methods.getTokenIdFor(keyOwner).call()
      assert.equal(tokenId, 1)
    })

    it('extending the key should not change the tokenID', async () => {
      let hasValidKey = await lockV4.methods.getHasValidKey(keyOwner).call()
      assert.equal(hasValidKey, true)
      await lockV4.methods.purchaseFor(keyOwner).send({
        value: keyPrice,
        from: keyOwner,
        gas: 4000000,
      })
      let tokenId = await lockV4.methods.getTokenIdFor(keyOwner).call()
      assert.equal(tokenId, 1)
    })

    it('2 new purchases should not share tokenIDs', async () => {
      await lockV4.methods.purchaseFor(keyOwner3).send({
        value: keyPrice,
        from: keyOwner,
        gas: 4000000,
      })
      await lockV4.methods.purchaseFor(keyOwner4).send({
        value: keyPrice,
        from: keyOwner,
        gas: 4000000,
      })
      let tokenId3 = await lockV4.methods.getTokenIdFor(keyOwner3).call()
      let tokenId4 = await lockV4.methods.getTokenIdFor(keyOwner4).call()
      assert.equal(tokenId3, 2)
      assert.equal(tokenId4, 3)
    })

    it('2 new key extensions should not share tokenIDs', async () => {
      let hasValidKey3 = await lockV4.methods.getHasValidKey(keyOwner3).call()
      let hasValidKey4 = await lockV4.methods.getHasValidKey(keyOwner4).call()
      assert.equal(hasValidKey3, true)
      assert.equal(hasValidKey4, true)
      let tokenId3 = await lockV4.methods.getTokenIdFor(keyOwner3).call()
      let tokenId4 = await lockV4.methods.getTokenIdFor(keyOwner4).call()
      assert.equal(tokenId3, 2)
      assert.equal(tokenId4, 3)
    })
  })

  describe('Transfers', () => {
    it('transfering a key to a brand new owner should also transfer the tokenID', async () => {
      let hasValidKey4 = await lockV4.methods.getHasValidKey(keyOwner4).call()
      assert.equal(hasValidKey4, true)
      await lockV4.methods
        .transferFrom(keyOwner4, keyOwner5, 3)
        .send({ from: keyOwner4, gas: 4000000 })
      let tokenId5 = await lockV4.methods.getTokenIdFor(keyOwner5).call()
      assert.equal(tokenId5, 3) // the tokenId is transferred in this case
    })

    it('when a valid key owner receives a second key', async () => {
      let hasValidKey3 = await lockV4.methods.getHasValidKey(keyOwner3).call()
      assert.equal(hasValidKey3, true)
      let hasValidKey5 = await lockV4.methods.getHasValidKey(keyOwner5).call()
      assert.equal(hasValidKey5, true)
      await lockV4.methods
        .transferFrom(keyOwner3, keyOwner5, 2)
        .send({ from: keyOwner3, gas: 4000000 })
      let tokenId5 = await lockV4.methods.getTokenIdFor(keyOwner5).call()
      assert.equal(tokenId5, 3) // tokenID does not change for recipient who has a valid key already
    })

    it('when the owner of an expired key receives a second key', async () => {
      let hasValidKey = await lockV4.methods.getHasValidKey(keyOwner).call()
      let tokenId = await lockV4.methods.getTokenIdFor(keyOwner).call()
      assert.equal(hasValidKey, true)
      assert.equal(tokenId, 1)
      await lockV4.methods.expireKeyFor(keyOwner5).send({
        from: lockOwner,
      })
      let hasValidKey5 = await lockV4.methods.getHasValidKey(keyOwner5).call()
      assert.equal(hasValidKey5, false)
      await lockV4.methods
        .transferFrom(keyOwner, keyOwner5, 1)
        .send({ from: keyOwner, gas: 4000000 })
      hasValidKey5 = await lockV4.methods.getHasValidKey(keyOwner5).call()
      let tokenId5 = await lockV4.methods.getTokenIdFor(keyOwner5).call()
      hasValidKey = await lockV4.methods.getHasValidKey(keyOwner).call()
      assert.equal(hasValidKey5, true)
      assert.equal(tokenId5, 1) // the tokenId is transferred in this case
      assert.equal(hasValidKey, false)
    })
  })
})
