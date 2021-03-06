pragma solidity 0.5.12;

import '@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol';


/**
 * @title An implementation of the money related functions.
 * @author HardlyDifficult (unlock-protocol.com)
 */
contract MixinFunds
{
  /**
   * The token-type that this Lock is priced in.  If 0, then use ETH, else this is
   * a ERC20 token address.
   */
  address public tokenAddress;

  function initialize(
    address _tokenAddress
  ) public
  {
    tokenAddress = _tokenAddress;
    require(
      _tokenAddress == address(0) || IERC20(_tokenAddress).totalSupply() > 0,
      'INVALID_TOKEN'
    );
  }

  /**
   * Gets the current balance of the account provided.
   */
  function getBalance(
    address _tokenAddress,
    address _account
  ) public view
    returns (uint)
  {
    if(_tokenAddress == address(0)) {
      return _account.balance;
    } else {
      return IERC20(_tokenAddress).balanceOf(_account);
    }
  }

  /**
   * Ensures that the msg.sender has paid at least the price stated.
   *
   * With ETH, this means the function originally called was `payable` and the
   * transaction included at least the amount requested.
   *
   * Security: be wary of re-entrancy when calling this function.
   */
  function _chargeAtLeast(
    uint _price
  ) internal returns (uint)
  {
    if(_price > 0) {
      if(tokenAddress == address(0)) {
        require(msg.value >= _price, 'NOT_ENOUGH_FUNDS');
        return msg.value;
      } else {
        IERC20 token = IERC20(tokenAddress);
        uint balanceBefore = token.balanceOf(address(this));
        token.transferFrom(msg.sender, address(this), _price);

        // There are known bugs in popular ERC20 implements which means we cannot
        // trust the return value of `transferFrom`.  This require statement ensures
        // that a transfer occurred.
        require(token.balanceOf(address(this)) > balanceBefore, 'TRANSFER_FAILED');

        return _price;
      }
    }
  }

  /**
   * Transfers funds from the contract to the account provided.
   *
   * Security: be wary of re-entrancy when calling this function.
   */
  function _transfer(
    address _tokenAddress,
    address _to,
    uint _amount
  ) internal
  {
    if(_amount > 0) {
      if(_tokenAddress == address(0)) {
        address(uint160(_to)).transfer(_amount);
      } else {
        IERC20 token = IERC20(_tokenAddress);
        uint balanceBefore = token.balanceOf(_to);
        token.transfer(_to, _amount);

        // There are known bugs in popular ERC20 implements which means we cannot
        // trust the return value of `transferFrom`.  This require statement ensures
        // that a transfer occurred.
        require(token.balanceOf(_to) > balanceBefore, 'TRANSFER_FAILED');
      }
    }
  }
}