import request from 'supertest'

import app = require('../../../src/app')
import Base64 = require('../../../src/utils/base64')
import ethJsUtil = require('ethereumjs-util')
import models = require('../../../src/models')
import sigUtil = require('eth-sig-util')
import UserOperations = require('../../../src/operations/userOperations')

function generateTypedData(message: any) {
  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
        { name: 'salt', type: 'bytes32' },
      ],
      User: [{ name: 'publicKey', type: 'address' }],
    },
    domain: {
      name: 'Unlock',
      version: '1',
    },
    primaryType: 'User',
    message: message,
  }
}

beforeAll(() => {
  let User = models.User
  let UserReference = models.UserReference

  return Promise.all([
    User.truncate({ cascade: true }),
    UserReference.truncate({ cascade: true }),
  ])
})

describe('when ejecting an address', () => {
  describe('when missing an appropriate signature', () => {
    it('returns a 401', async () => {
      expect.assertions(1)

      let response = await request(app).post(
        '/users/0xD8fDbF2302b13d4CF00BAC1a25EFb786759c7788/eject'
      )

      expect(response.status).toBe(401)
    })
  })
  describe('when the address exists', () => {
    it('returns 202', async () => {
      expect.assertions(1)

      let privateKey = ethJsUtil.toBuffer(
        '0x00a7bd3ec661f15214f8a48dce017e27dd8e1b4b779aaf823d8eb74d8c960b95'
      )

      let message = {
        user: {
          publicKey: '0xD8fDbF2302b13d4CF00BAC1a25EFb786759c7788',
        },
      }

      let typedData = generateTypedData(message)

      const sig = sigUtil.signTypedData(privateKey, {
        data: typedData,
        from: '',
      })

      let emailAddress = 'existing@example.com'
      let userCreationDetails = {
        emailAddress: emailAddress,
        publicKey: '0xd8fdbf2302b13d4cf00bac1a25efb786759c7788',
        passwordEncryptedPrivateKey: '{"data" : "encryptedPassword"}',
        recoveryPhrase: 'a recovery phrase',
      }

      await UserOperations.createUser(userCreationDetails)

      let response = await request(app)
        .post('/users/0xD8fDbF2302b13d4CF00BAC1a25EFb786759c7788/eject')
        .set('Authorization', `Bearer ${Base64.encode(sig)}`)
        .send(typedData)

      expect(response.status).toBe(202)
    })
  })

  describe("when the address doesn't exit", () => {
    it('returns 400', async () => {
      expect.assertions(1)

      let privateKey = ethJsUtil.toBuffer(
        '0xc7f80893d7a8eda620643280aedd684e87541555c9de450f70e11eb53c7cd02e'
      )

      let message = {
        user: {
          publicKey: '0xef49773e0d59f607cea8c8be4ce87bd26fd8e208',
        },
      }

      let typedData = generateTypedData(message)

      const sig = sigUtil.signTypedData(privateKey, {
        data: typedData,
        from: '',
      })

      let response = await request(app)
        .post('/users/0xef49773e0d59f607cea8c8be4ce87bd26fd8e208/eject')
        .set('Authorization', `Bearer ${Base64.encode(sig)}`)
        .send(typedData)

      expect(response.status).toBe(400)
    })
  })

  describe('when the address/associated account has been ejected', () => {
    it('returns 400', async () => {
      expect.assertions(1)

      let privateKey = ethJsUtil.toBuffer(
        '0xa272d59fbefc1eb1564b5a0f7c603f645965f02e3175f08d40e5486a5dcebd1c'
      )

      let message = {
        user: {
          publicKey: '0x9409bd2f87f0698f89c04caee8ddb2fd9e44bcc3',
        },
      }

      let typedData = generateTypedData(message)

      const sig = sigUtil.signTypedData(privateKey, {
        data: typedData,
        from: '',
      })

      let emailAddress = 'ejected_user@example.com'
      let userCreationDetails = {
        emailAddress: emailAddress,
        publicKey: '0x9409bd2f87f0698f89c04caee8ddb2fd9e44bcc3',
        passwordEncryptedPrivateKey: '{"data" : "encryptedPassword"}',
      }

      await UserOperations.createUser(userCreationDetails)
      await UserOperations.eject(userCreationDetails.publicKey)

      let response = await request(app)
        .post('/users/0x9409bd2f87f0698f89c04caee8ddb2fd9e44bcc3/eject')
        .set('Authorization', `Bearer ${Base64.encode(sig)}`)
        .send(typedData)
      expect(response.status).toBe(400)
    })
  })
})
