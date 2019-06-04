import { getTransactions, getAccount } from '../cacheHandler'

export default async function web3ServiceHub({
  web3Service,
  onChange,
  window,
}) {
  web3Service.on('transaction.updated', async (hash, update) => {
    const account = await getAccount(window)
    const transactions = await getTransactions(window)
    // we need to build on the previous transaction because 'transaction.updated'
    // never returns the full transaction, we will rely upon the cache
    const transaction = transactions[hash] || {
      hash,
      blockNumber: Number.MAX_SAFE_INTEGER,
    }
    onChange({
      transaction: {
        ...transaction,
        ...update,
      },
    })
    if (transaction.key) {
      const key = await web3Service.getKeyByLockForOwner(
        transaction.lock,
        account
      )
      onChange({
        key,
      })
    }
  })
  web3Service.on('error', error => {
    onChange({ error })
  })
}
