pragma solidity 0.5.12;


interface IUnlockEventHooks {
  /**
   * @notice If the lock owner has registered an implementer for this interface with ERC-1820
   * then this hook is called with every key sold.
   * @dev Use the interface name `keccak256("IUnlockEventHooks_keySold")`
   * which is 4d99da10ff5120f726d35edd8dbd417bbe55d90453b8432acd284e650ee2c6f0
   * @param from the msg.sender making the purchase
   * @param to the account which will be granted a key
   * @param referrer the account which referred this key sale
   * @param pricePaid the amount paid for the key, in the lock's currency (ETH or a ERC-20 token)
   * @param data arbitrary data populated by the front-end which initiated the sale
   */
  function keySold(
    address from,
    address to,
    address referrer,
    uint256 pricePaid,
    bytes calldata data
  ) external;

  /**
   * @notice If the lock owner has registered an implementer for this interface with ERC-1820
   * then this hook is called with every key cancel.
   * @dev Use the interface name `keccak256("IUnlockEventHooks_keyCancel")`
   * which is 0xd6342b4bfdf66164985c9f5fe235f643a035ee12f507d7bd0f8c89e07e790f68
   * @param operator the msg.sender issuing the cancel
   * @param to the account which had the key canceled
   * @param refund the amount sent to the `to` account (ETH or a ERC-20 token)
   */
  function keyCancel(
    address operator,
    address to,
    uint256 refund
  ) external;
}