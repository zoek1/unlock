import reducer, { initialState } from '../../reducers/locksReducer'
import {
  CREATE_LOCK,
  DELETE_LOCK,
  UPDATE_LOCK,
  UPDATE_LOCK_KEY_PRICE,
} from '../../actions/lock'
import { SET_ACCOUNT } from '../../actions/accounts'
import { DELETE_TRANSACTION } from '../../actions/transaction'
import { SET_PROVIDER } from '../../actions/provider'
import { SET_NETWORK } from '../../actions/network'

describe('locks reducer', () => {
  const lock = {
    address: '123',
  }

  it('should return the initial state', () => {
    expect.assertions(1)
    expect(reducer(undefined, {})).toBe(initialState)
  })

  it('should return the initial state when receveing SET_PROVIDER', () => {
    expect.assertions(1)
    expect(
      reducer(
        {
          [lock.address]: lock,
        },
        {
          type: SET_PROVIDER,
        }
      )
    ).toBe(initialState)
  })

  it('should return the initial state when receveing SET_NETWORK', () => {
    expect.assertions(1)
    expect(
      reducer(
        {
          [lock.address]: lock,
        },
        {
          type: SET_NETWORK,
        }
      )
    ).toBe(initialState)
  })

  it('should add the lock when receiving CREATE_LOCK and if it was not there yet', () => {
    expect.assertions(1)
    expect(
      reducer(undefined, {
        type: CREATE_LOCK,
        lock,
      })
    ).toEqual({
      [lock.address]: lock,
    })
  })

  it('should not add the lock when receiving CREATE_LOCK if the lock has no address', () => {
    expect.assertions(1)
    expect(
      reducer(initialState, {
        type: CREATE_LOCK,
        lock: {
          name: 'no address lock',
        },
      })
    ).toEqual(initialState)
  })

  it('should delete a lock when DELETE_TRANSACTION is called for a transaction which created that lock', () => {
    expect.assertions(1)
    const transaction = {
      lock: lock.address,
    }
    expect(
      reducer(
        {
          [lock.address]: lock,
        },
        {
          type: DELETE_TRANSACTION,
          transaction,
        }
      )
    ).toEqual({})
  })

  it('should not delete a lock when DELETE_TRANSACTION is called for a transaction which created another lock', () => {
    expect.assertions(1)
    const transaction = {
      lock: `${lock.address}x`,
    }
    expect(
      reducer(
        {
          [lock.address]: lock,
        },
        {
          type: DELETE_TRANSACTION,
          transaction,
        }
      )
    ).toEqual({
      [lock.address]: lock,
    })
  })

  // Upon changing account, we need to clear the existing locks. The web3 middleware will
  // re-populate them
  it('should clear the locks when receiving SET_ACCOUNT', () => {
    expect.assertions(1)
    const account = {}
    expect(
      reducer(
        {
          [lock.address]: lock,
        },
        {
          type: SET_ACCOUNT,
          account,
        }
      )
    ).toBe(initialState)
  })

  describe('DELETE_LOCK', () => {
    it('should delete a lock', () => {
      expect.assertions(1)
      const state = {
        '0x123': {
          address: '0x123',
        },
      }
      const action = {
        type: DELETE_LOCK,
        address: '0x123',
      }
      expect(reducer(state, action)).toEqual({})
    })
  })

  describe('UPDATE_LOCK', () => {
    it('should keep state unchanged if trying to update the lock address', () => {
      expect.assertions(1)
      const state = {
        '0x123': {
          name: 'hello',
          address: '0x123',
        },
      }
      const action = {
        type: UPDATE_LOCK,
        address: '0x123',
        update: {
          address: '0x456',
        },
      }
      expect(reducer(state, action)).toEqual(state)
    })

    it('should insert the new lock when the lock being updated does not exist', () => {
      expect.assertions(1)
      const state = {
        '0x123': {
          name: 'hello',
          address: '0x123',
        },
      }
      const newLock = {
        address: '0x456',
      }
      const action = {
        type: UPDATE_LOCK,
        address: newLock.address,
        update: newLock,
      }
      expect(reducer(state, action)).toEqual({
        ...state,
        [newLock.address]: newLock,
      })
    })

    it('should update the locks values', () => {
      expect.assertions(1)
      const state = {
        '0x123': {
          name: 'hello',
          address: '0x123',
        },
      }
      const action = {
        type: UPDATE_LOCK,
        address: '0x123',
        update: {
          name: 'world',
          keyPrice: '1.001',
        },
      }
      expect(reducer(state, action)).toEqual({
        '0x123': {
          name: 'world',
          address: '0x123',
          keyPrice: '1.001',
        },
      })
    })
  })

  it("should update a lock's key price when UPDATE_LOCK_KEY_PRICE is called", () => {
    expect.assertions(1)
    const state = {
      '0x123': {
        name: 'hello',
        address: '0x123',
        keyPrice: '0.01',
      },
    }
    const action = {
      type: UPDATE_LOCK_KEY_PRICE,
      address: '0x123',
      price: '0.02',
    }
    expect(reducer(state, action)).toEqual({
      '0x123': {
        name: 'hello',
        address: '0x123',
        keyPrice: '0.02',
      },
    })
  })
})
