/* eslint no-console: 0 */
const dotenv = require('dotenv')
const path = require('path')

const unlockEnv = process.env.UNLOCK_ENV || 'dev'

dotenv.config({
  path: path.resolve(__dirname, '..', `.env.${unlockEnv}.local`),
})

const requiredConfigVariables = {
  unlockEnv,
  accountsUrl: process.env.USER_IFRAME_URL,
  paywallUrl: process.env.PAYWALL_URL,
  usersIframeUrl: process.env.USER_IFRAME_URL,
  readOnlyProvider: process.env.READ_ONLY_PROVIDER,
  locksmithUri: process.env.LOCKSMITH_URI,
  erc20ContractSymbol: process.env.ERC20_CONTRACT_SYMBOL,
  erc20ContractAddress: process.env.ERC20_CONTRACT_ADDRESS,
}

const optionalConfigVariables = {
  httpProvider: process.env.HTTP_PROVIDER,
  debugMode: process.env.DEBUG,
}

Object.keys(requiredConfigVariables).forEach(configVariableName => {
  if (!requiredConfigVariables[configVariableName]) {
    if (['dev', 'test'].indexOf(requiredConfigVariables.unlockEnv) > -1) {
      return console.error(
        `The configuration variable ${configVariableName} is falsy.`
      )
    }
    throw new Error(
      `The configuration variable ${configVariableName} is falsy.`
    )
  }
})

module.exports = {
  ...requiredConfigVariables,
  ...optionalConfigVariables,
}
