// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// This is a mock ERC20 token with 6 decimals to simulate USDT
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "mUSDT") {
        _mint(msg.sender, 1_000_000 * 10**6); // Mint 1M mUSDT to deployer
    }

    // Override decimals to return 6
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Public mint function for testing purposes
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}