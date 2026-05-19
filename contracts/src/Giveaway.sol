// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GiveawayFactory.sol";

contract Giveaway is Ownable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    enum Status {
        Open,
        Drawing,
        Resolved
    }

    IERC20 public immutable prizeToken;
    IERC20 public immutable entryToken;
    address public immutable sponsor;
    uint256 public immutable entryFee;
    uint64 public immutable endAt;
    Status public status;
    uint256 public bonusPool;
    uint256 public prizePool;
    uint256 public numWinners;
    EnumerableSet.AddressSet private entrantsSet;
    address[] public winners;
    mapping(address => bool) public hasEntered;
    mapping(address => uint256) public unclaimedPrize;
    mapping(address => uint256) public unclaimedBonus;
    uint256[] public tierAmounts;

    event Entered(address indexed entrant, uint256 feePaid, uint256 newBonusPool);
    event WinnersSelected(address[] winners, uint256[] amounts);
    event PrizePaid(address indexed winner, uint256 amount);
    event BonusPaid(address indexed winner, uint256 amount);
    event PrizeClaimed(address indexed winner, uint256 prizeAmount, uint256 bonusAmount);
    event GiveawayCancelled(address indexed sponsor, uint256 prizeRefunded, uint256 entryFeesRefunded);
    event TokensRescued(address indexed token, address indexed to, uint256 amount);

    constructor(
        address prizeToken_,
        address entryToken_,
        GiveawayFactory.Tier[] memory tiers,
        uint256 entryFee_,
        uint64 endAt_,
        address sponsor_
    ) Ownable(sponsor_) {
        require(endAt_ > block.timestamp + 1 hours, "endAt must be in the future");
        require(tiers.length > 0, "must provide tiers");
        require(prizeToken_ != address(0), "prize token is zero");
        require(entryToken_ != address(0), "entry token is zero");

        prizeToken = IERC20(prizeToken_);
        entryToken = IERC20(entryToken_);
        sponsor = sponsor_;
        entryFee = entryFee_;
        endAt = endAt_;
        // Campaigns are Open from creation. Sponsor doesn't need to fund up-front —
        // they fund the contract whenever they decide (typically after the campaign
        // ends, before / right after selectWinners). Until then, the push-payout in
        // selectWinners falls back to `unclaimedPrize` and winners claim() later.
        status = Status.Open;
        numWinners = tiers.length;

        for (uint256 i = 0; i < tiers.length; i++) {
            require(tiers[i].amount > 0, "tier amount must be positive");
            tierAmounts.push(tiers[i].amount);
            prizePool += tiers[i].amount;
        }
    }

    function getState()
        external
        view
        returns (
            uint8,
            uint256,
            uint256,
            uint256,
            uint256,
            uint64
        )
    {
        return (
            uint8(status),
            entryFee,
            bonusPool,
            entrantsSet.length(),
            numWinners,
            endAt
        );
    }

    function enter() external {
        require(status == Status.Open, "giveaway not open");
        require(block.timestamp < endAt, "giveaway has ended");
        require(!hasEntered[msg.sender], "already entered");

        // CEI: set state flags BEFORE the external token transfer so an
        // ERC777/ERC677-style callback cannot re-enter enter() for the same
        // address. Entry token in production is USDT/USDC (no callbacks),
        // but defensive ordering is cheap.
        hasEntered[msg.sender] = true;
        entrantsSet.add(msg.sender);

        if (entryFee > 0) {
            // Ticket fee stays in the contract as sponsor revenue. The jackpot
            // is fixed at sponsor-set tier amounts; fees do NOT grow the
            // prize pool. Sponsor withdraws fees via `rescueTokens` at their
            // discretion.
            entryToken.safeTransferFrom(msg.sender, address(this), entryFee);
        }
        // newBonusPool param stays in the event signature for ABI compatibility
        // but is always 0 in this design.
        emit Entered(msg.sender, entryFee, 0);
    }

    function selectWinners(address[] calldata selectedWinners) external onlyOwner {
        require(status == Status.Open, "giveaway not open for selection");
        require(block.timestamp >= endAt, "giveaway not yet ended");
        require(entrantsSet.length() > 0, "no entrants");
        require(selectedWinners.length > 0 && selectedWinners.length <= numWinners, "invalid winner count");

        // Validate all selected winners are entrants
        for (uint256 i = 0; i < selectedWinners.length; i++) {
            require(hasEntered[selectedWinners[i]], "selected winner is not an entrant");
            // Check for duplicates in selection
            for (uint256 j = i + 1; j < selectedWinners.length; j++) {
                require(selectedWinners[i] != selectedWinners[j], "duplicate winner selected");
            }
        }

        status = Status.Resolved;
        winners = selectedWinners;
        uint256[] memory payouts = new uint256[](selectedWinners.length);
        uint256 firstPlaceBonus = bonusPool;
        bonusPool = 0;

        for (uint256 i = 0; i < selectedWinners.length; i++) {
            payouts[i] = tierAmounts[i];
            address winner = selectedWinners[i];

            // Push prize-token tier amount with claim fallback.
            // try/catch handles tokens that REVERT on insufficient balance
            // (USDT, USDC, OZ ERC20Mock) -- those would otherwise kill the
            // whole selectWinners tx when the sponsor hasn't pre-funded.
            try prizeToken.transfer(winner, payouts[i]) returns (bool paid) {
                if (paid) {
                    emit PrizePaid(winner, payouts[i]);
                } else {
                    unclaimedPrize[winner] = payouts[i];
                }
            } catch {
                unclaimedPrize[winner] = payouts[i];
            }

            // 1st place additionally receives the entry-token bonus pool
            if (i == 0 && firstPlaceBonus > 0) {
                try entryToken.transfer(winner, firstPlaceBonus) returns (bool bonusPaid) {
                    if (bonusPaid) {
                        emit BonusPaid(winner, firstPlaceBonus);
                    } else {
                        unclaimedBonus[winner] = firstPlaceBonus;
                    }
                } catch {
                    unclaimedBonus[winner] = firstPlaceBonus;
                }
            }
        }

        emit WinnersSelected(winners, payouts);
    }

    function claim() external {
        uint256 prizeAmount = unclaimedPrize[msg.sender];
        uint256 bonusAmount = unclaimedBonus[msg.sender];
        require(prizeAmount > 0 || bonusAmount > 0, "nothing to claim");

        if (prizeAmount > 0) {
            unclaimedPrize[msg.sender] = 0;
            require(prizeToken.transfer(msg.sender, prizeAmount), "prize transfer failed");
        }
        if (bonusAmount > 0) {
            unclaimedBonus[msg.sender] = 0;
            require(entryToken.transfer(msg.sender, bonusAmount), "bonus transfer failed");
        }

        emit PrizeClaimed(msg.sender, prizeAmount, bonusAmount);
    }

    function entrants() external view returns (address[] memory) {
        address[] memory result = new address[](entrantsSet.length());
        for (uint256 i = 0; i < entrantsSet.length(); i++) {
            result[i] = entrantsSet.at(i);
        }
        return result;
    }

    /// @notice Cancel an Open giveaway. Refunds the contract's prize-token balance
    ///         to the sponsor (may be 0 if they haven't funded yet) and every
    ///         entry fee back to its entrant.
    function cancel() external onlyOwner {
        require(status == Status.Open, "giveaway not cancellable");

        status = Status.Resolved;

        uint256 entrantCount = entrantsSet.length();
        uint256 entryFeesRefunded;
        if (entryFee > 0) {
            for (uint256 i = 0; i < entrantCount; i++) {
                address entrant = entrantsSet.at(i);
                entryToken.safeTransfer(entrant, entryFee);
                entryFeesRefunded += entryFee;
            }
        }
        bonusPool = 0;
        prizePool = 0;

        // Refund whatever prize tokens were actually sent. Handles under-funding
        // (sponsor cancels before marking funded) and exact-funding alike.
        uint256 prizeBalance = prizeToken.balanceOf(address(this));
        if (prizeBalance > 0) {
            prizeToken.safeTransfer(sponsor, prizeBalance);
        }

        emit GiveawayCancelled(sponsor, prizeBalance, entryFeesRefunded);
    }

    /// @notice Recover stray tokens. Both prize and entry tokens are blocked
    ///         to prevent the sponsor draining the prize pool or entrants' fees.
    function rescueTokens(IERC20 token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "to is zero address");
        require(address(token) != address(prizeToken), "cannot rescue prize token");
        require(address(token) != address(entryToken), "cannot rescue entry token");
        token.safeTransfer(to, amount);
        emit TokensRescued(address(token), to, amount);
    }
}
