// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GameToken.sol";

contract TokenStore is Ownable, ReentrancyGuard {
    IERC20 public immutable usdtToken;
    GameToken public immutable gameToken;
    uint256 public immutable gtPerUsdt;

    event Purchase(address indexed buyer, uint256 usdtAmount, uint256 gtOut);

    constructor(
        address _usdt,
        address _gameToken,
        uint256 _gtPerUsdt
    ) Ownable(msg.sender) {
        usdtToken = IERC20(_usdt);
        gameToken = GameToken(_gameToken);
        gtPerUsdt = _gtPerUsdt;
    }

    /**
     * @dev Allows a user to buy GameTokens by spending their USDT.
     * The user must first approve this contract to spend their USDT.
     */
    function buy(uint256 usdtAmount) public nonReentrant {
        require(usdtAmount > 0, "TS: Amount must be > 0");

        // Calculate the amount of GameTokens to mint.
        // USDT has 6 decimals, GT has 18.
        // gtOut = (usdtAmount * 10^6) * (gtPerUsdt / 10^18) / (10^6) = usdtAmount * gtPerUsdt / 10^6
        uint256 gtOut = (usdtAmount * gtPerUsdt) / 1e6;
        require(gtOut > 0, "TS: No GT would be minted for this amount");

        // Pull USDT from the buyer. This is the "Interactions" part.
        // This follows the Checks-Effects-Interactions (CEI) pattern.
        bool success = usdtToken.transferFrom(msg.sender, address(this), usdtAmount);
        require(success, "TS: USDT transfer failed");

        // Mint GT to the buyer. This is the "Effects" part.
        gameToken.mint(msg.sender, gtOut);

        emit Purchase(msg.sender, usdtAmount, gtOut);
    }

    /**
     * @dev Allows the owner to withdraw collected USDT from the contract.
     */
    function withdrawUSDT(address to, uint256 amount) public onlyOwner {
        uint256 balance = usdtToken.balanceOf(address(this));
        require(amount <= balance, "TS: Insufficient balance");
        bool success = usdtToken.transfer(to, amount);
        require(success, "TS: USDT withdrawal failed");
    }
}