const Units = require('ethereumjs-units')
const Web3Utils = require('web3-utils')
const { TestHelper } = require('@openzeppelin/cli')
const { ZWeb3, Contracts } = require('@openzeppelin/upgrades')

ZWeb3.initialize(web3.currentProvider)
const UnlockV4 = Contracts.getFromNodeModules('unlock-abi-1-1', '../../Unlock')
const PublicLockV4 = require('unlock-abi-1-1/PublicLock')

const UnlockLatest = Contracts.getFromLocal('Unlock')
const PublicLockLatest = Contracts.getFromLocal('PublicLock')

let project, proxy, unlock

contract('Unlock / upgrades', accounts => {
  const unlockOwner = accounts[9]
  const lockOwner = accounts[1]
  const keyOwner = accounts[2]
  const keyOwner3 = accounts[3]
  const keyOwner4 = accounts[4]
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
        60 * 1 * 1, // expirationDuration 1 hr
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

  describe('Expired key token ID', () => {
    it('should still have a tokenId of 1 after expiration', async () => {
      await lockV4.methods.expireKeyFor(keyOwner).send({
        from: lockOwner,
      })
      let hasValidKey = await lockV4.methods.getHasValidKey(keyOwner).call()
      let isKeyOwner = await lockV4.methods.isKeyOwner(1, keyOwner).call()
      assert.equal(hasValidKey, false)
      assert.equal(isKeyOwner, true)
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

  describe('latest', () => {
    before(async () => {
      await project.upgradeProxy(proxy.address, UnlockLatest)
      unlock = await UnlockLatest.at(proxy.address)
      const lock = await PublicLockLatest.new({
        from: unlockOwner,
        gas: 6700000,
      })
      await unlock.methods
        .configUnlock(
          lock.address,
          await unlock.methods.globalTokenSymbol().call(),
          await unlock.methods.globalBaseTokenURI().call()
        )
        .send({
          from: unlockOwner,
        })
    })

    describe('Using latest version after an upgrade', () => {
      let lockLatest

      before(async () => {
        // Create a new Lock
        const lockTx = await unlock.methods
          .createLock(
            60 * 60 * 24, // expirationDuration 1 day
            Web3Utils.padLeft(0, 40),
            keyPrice,
            5, // maxNumberOfKeys
            'After-Upgrade Lock'
          )
          .send({
            from: lockOwner,
            gas: 6000000,
          })
        // THIS API IS LIKELY TO BREAK BECAUSE IT ASSUMES SO MUCH
        const evt = lockTx.events.NewLock
        lockLatest = await PublicLockLatest.at(evt.returnValues.newLockAddress)

        // Buy Key
        await lockLatest.methods
          .purchase(0, keyOwner, web3.utils.padLeft(0, 40), [])
          .send({
            value: keyPrice,
            from: keyOwner,
            gas: 4000000,
          })
      })
    })
  })
})
