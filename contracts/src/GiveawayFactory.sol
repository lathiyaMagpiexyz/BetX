// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Giveaway.sol";

contract GiveawayFactory is Ownable {
    using SafeERC20 for IERC20;

    struct Tier {
        uint8 rank;
        uint256 amount;
    }

    /// @notice The token entrants must pay to enter every giveaway from this factory.
    ///         Set once at deployment (e.g. BUSDT on BSC, USDC on Base).
    address public immutable entryToken;

    /// @notice Append-only list of every giveaway this factory has spawned.
    ///         Indexing-free directory: `getAllGiveaways()` returns the full
    ///         array in a single read, so listing pages don't need to scan
    ///         `eth_getLogs` (which most public RPCs throttle or limit).
    address[] public giveaways;

    event GiveawayCreated(
        address indexed giveaway,
        address indexed sponsor,
        address indexed prizeToken,
        uint256 entryFee,
        uint64 endAt
    );
    event TokensRescued(address indexed token, address indexed to, uint256 amount);

    constructor(address entryToken_) Ownable(msg.sender) {
        require(entryToken_ != address(0), "entry token is zero");
        entryToken = entryToken_;
    }

    /// @notice Deploys a new Giveaway. Restricted to the factory owner (platform
    ///         admin). The caller becomes the sponsor / owner of the new Giveaway.
    ///
    ///         Creation moves NO funds. The new contract starts `Open` and accepts
    ///         entries immediately. The sponsor sends prize tokens later (typically
    ///         after the campaign ends, before / right after selectWinners). Until
    ///         then, the push-payout in selectWinners falls back to `unclaimedPrize`
    ///         and winners settle via `claim()` once the contract is funded.
    function create(
        address prizeToken,
        Tier[] calldata tiers,
        uint256 entryFee,
        uint64 endAt
    ) external onlyOwner returns (address) {
        require(endAt > block.timestamp + 1 hours, "endAt must be in the future");
        require(tiers.length > 0, "must provide tiers");

        for (uint256 i = 0; i < tiers.length; i++) {
            require(tiers[i].amount > 0, "tier amount must be positive");
        }

        Giveaway giveaway = new Giveaway(
            prizeToken,
            entryToken,
            _copyTiersToMemory(tiers),
            entryFee,
            endAt,
            msg.sender
        );

        giveaways.push(address(giveaway));
        emit GiveawayCreated(address(giveaway), msg.sender, prizeToken, entryFee, endAt);
        return address(giveaway);
    }

    /// @notice Returns the full directory of giveaways this factory has spawned.
    /// @dev Frontend listing pages call this instead of scanning event logs.
    function getAllGiveaways() external view returns (address[] memory) {
        return giveaways;
    }

    function giveawaysCount() external view returns (uint256) {
        return giveaways.length;
    }

    function _copyTiersToMemory(Tier[] calldata tiers)
        private
        pure
        returns (Tier[] memory)
    {
        Tier[] memory tiersMemory = new Tier[](tiers.length);
        for (uint256 i = 0; i < tiers.length; i++) {
            tiersMemory[i] = tiers[i];
        }
        return tiersMemory;
    }

    /// @notice Recover ERC20 tokens sent to the factory by mistake. The factory
    ///         is not expected to hold balances, so this is a defensive admin tool.
    function rescueTokens(IERC20 token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "to is zero address");
        token.safeTransfer(to, amount);
        emit TokensRescued(address(token), to, amount);
    }
}
