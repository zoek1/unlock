const Units = require('ethereumjs-units')
const BigNumber = require('bignumber.js')
const truffleAssert = require('truffle-assertions')

const deployLocks = require('../helpers/deployLocks')
const shouldFail = require('../helpers/shouldFail')

const unlockContract = artifacts.require('../Unlock.sol')
const getProxy = require('../helpers/proxy')

let unlock, locks

function fixSignature(signature) {
  // in geth its always 27/28, in ganache its 0/1. Change to 27/28 to prevent
  // signature malleability if version is 0/1
  // see https://github.com/ethereum/go-ethereum/blob/v1.8.23/internal/ethapi/api.go#L465
  let v = parseInt(signature.slice(130, 132), 16)
  if (v < 27) {
    v += 27
  }
  const vHex = v.toString(16)
  return signature.slice(0, 130) + vHex
}

// signs message in node (ganache auto-applies "Ethereum Signed Message" prefix)
async function signMessage(messageHex, signer) {
  return fixSignature(await web3.eth.sign(messageHex, signer))
}

contract('Lock / cancelAndRefundFor', accounts => {
  let lock
  const keyOwners = [accounts[1], accounts[2], accounts[3], accounts[4]]
  const txSender = accounts[9]
  const keyPrice = new BigNumber(Units.convert(0.01, 'eth', 'wei'))
  let lockOwner

  beforeEach(async () => {
    unlock = await getProxy(unlockContract)
    locks = await deployLocks(unlock, accounts[0])

    lock = locks['SECOND']
    const purchases = keyOwners.map(account => {
      return lock.purchase(0, account, web3.utils.padLeft(0, 40), [], {
        value: keyPrice.toFixed(),
        from: account,
      })
    })
    await Promise.all(purchases)
    lockOwner = await lock.owner.call()
  })

  it('can read the current nonce', async () => {
    const nonce = new BigNumber(await lock.keyOwnerToNonce.call(keyOwners[0]))
    assert.equal(nonce.toFixed(), 0)
  })

  it('can increment nonce', async () => {
    await lock.invalidateOffchainApproval('1', { from: keyOwners[0] })
  })

  describe('should cancel and refund when enough time remains', () => {
    let initialLockBalance, initialTxSenderBalance, txObj, withdrawAmount

    beforeEach(async () => {
      initialLockBalance = new BigNumber(
        await web3.eth.getBalance(lock.address)
      )
      initialTxSenderBalance = new BigNumber(
        await web3.eth.getBalance(txSender)
      )
      const signature = await signMessage(
        await lock.getCancelAndRefundApprovalHash(keyOwners[0], txSender, {
          from: keyOwners[0],
        }),
        keyOwners[0]
      )
      txObj = await lock.cancelAndRefundFor(keyOwners[0], signature, {
        from: txSender,
      })
      withdrawAmount = new BigNumber(initialLockBalance).minus(
        await web3.eth.getBalance(lock.address)
      )
    })

    it('the amount of refund should be greater than 0', async () => {
      truffleAssert.eventEmitted(txObj, 'CancelKey', e => {
        const refund = new BigNumber(e.refund)
        return refund.gt(0) && refund.toFixed() === withdrawAmount.toFixed()
      })
    })

    it('should make the key no longer valid (i.e. expired)', async () => {
      const isValid = await lock.getHasValidKey.call(keyOwners[0])
      assert.equal(isValid, false)
    })

    it('can read the non-zero nonce', async () => {
      const nonce = new BigNumber(await lock.keyOwnerToNonce.call(keyOwners[0]))
      assert.equal(nonce.toFixed(), 1)
    })

    it("should increase the sender's balance with the amount of funds withdrawn from the lock", async () => {
      const txHash = await web3.eth.getTransaction(txObj.tx)
      const gasUsed = new BigNumber(txObj.receipt.gasUsed)
      const gasPrice = new BigNumber(txHash.gasPrice)
      const txFee = gasPrice.times(gasUsed)
      const finalTxSenderBalance = new BigNumber(
        await web3.eth.getBalance(txSender)
      )
      assert(
        finalTxSenderBalance.toFixed(),
        initialTxSenderBalance
          .plus(withdrawAmount)
          .minus(txFee)
          .toFixed()
      )
    })

    it('emits NonceChanged', async () => {
      const e = txObj.receipt.logs.find(e => e.event === 'NonceChanged')
      assert.equal(e.args.keyOwner, keyOwners[0])
      assert.equal(e.args.nextAvailableNonce, '1')
    })
  })

  describe('should fail when', () => {
    /**
     * This is a risk: we refund via CC but can't cancel the key because the KeyOwner
     * incremented their nonce first.
     */
    it('the user incremented their nonce after signing', async () => {
      const signature = await signMessage(
        await lock.getCancelAndRefundApprovalHash(keyOwners[1], txSender),
        keyOwners[1]
      )
      await lock.invalidateOffchainApproval('1', { from: keyOwners[1] })
      await shouldFail(
        lock.cancelAndRefundFor(keyOwners[1], signature, {
          from: txSender,
        }),
        'INVALID_SIGNATURE'
      )
    })

    it('the approval is used twice', async () => {
      const signature = await signMessage(
        await lock.getCancelAndRefundApprovalHash(keyOwners[2], txSender),
        keyOwners[2]
      )
      await lock.cancelAndRefundFor(keyOwners[2], signature, {
        from: txSender,
      })
      await lock.purchase(0, keyOwners[2], web3.utils.padLeft(0, 40), [], {
        from: keyOwners[2],
        value: keyPrice.toFixed(),
      })
      await shouldFail(
        lock.cancelAndRefundFor(keyOwners[2], signature, {
          from: txSender,
        }),
        'INVALID_SIGNATURE'
      )
    })

    it('the signature is invalid', async () => {
      let signature = await signMessage(
        await lock.getCancelAndRefundApprovalHash(keyOwners[3], txSender),
        keyOwners[3]
      )
      signature =
        signature.substr(0, 4) +
        (signature[4] === '0' ? '1' : '0') +
        signature.substr(5)
      await shouldFail(
        lock.cancelAndRefundFor(keyOwners[3], signature, {
          from: txSender,
        }),
        'INVALID_SIGNATURE'
      )
    })

    /**
     * This is a risk: we refund via CC but can't cancel the key because the Lock is broke
     */
    it('should fail if the Lock owner withdraws too much funds', async () => {
      await lock.withdraw(await lock.tokenAddress.call(), 0, {
        from: lockOwner,
      })

      const signature = await signMessage(
        await lock.getCancelAndRefundApprovalHash(keyOwners[3], txSender),
        keyOwners[3]
      )
      await shouldFail(
        lock.cancelAndRefundFor(keyOwners[3], signature, {
          from: txSender,
        }),
        ''
      )
    })

    /**
     * This is a risk: we refund via CC but can't cancel the key because the KeyOwner
     * or Lock owner canceled the key first.
     */
    it('the key is expired', async () => {
      await lock.expireKeyFor(keyOwners[3], {
        from: lockOwner,
      })

      const signature = await signMessage(
        await lock.getCancelAndRefundApprovalHash(keyOwners[3], txSender),
        keyOwners[3]
      )
      await shouldFail(
        lock.cancelAndRefundFor(keyOwners[3], signature, {
          from: txSender,
        }),
        'KEY_NOT_VALID'
      )
    })
  })
})
