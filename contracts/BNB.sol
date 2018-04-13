pragma solidity ^0.4.18;

import "./token/ERC20Token.sol";

contract BNBToken is ERC20Token {
    function BNBToken() public {
        name = "BNB";
        symbol = "BNB";
        decimals = 18;
    }
}
