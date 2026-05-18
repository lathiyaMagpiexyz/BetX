// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import "../src/Giveaway.sol";
import "../src/GiveawayFactory.sol";

contract GiveawayTest is Test {
    ERC20Mock internal prize;
    ERC20Mock internal usdt;
    GiveawayFactory internal factory;
    address internal constant sponsor = address(0xABCD);
    address internal constant entrant1 = address(0xCAFE);
    address internal constant entrant2 = address(0xBEEF);
    address internal constant entrant3 = address(0xDEAD);

    // Status enum: 0=Open, 1=Drawing, 2=Resolved
    uint8 internal constant STATUS_OPEN = 0;
    uint8 internal constant STATUS_RESOLVED = 2;

    function setUp() public {
        prize = new ERC20Mock();
        usdt = new ERC20Mock();
        prize.mint(sponsor, 10_000_000e6);
        usdt.mint(entrant1, 10_000e18);
        usdt.mint(entrant2, 10_000e18);
        usdt.mint(entrant3, 10_000e18);
        vm.prank(sponsor);
        factory = new GiveawayFactory(address(usdt));
    }

    /// @dev Deploy a giveaway in Open state. No prize funds moved — that's the
    ///      sponsor's later decision. Use this as the base for tests where you
    ///      don't care whether prize payouts succeed (they fall through to claim).
    function _deploy(
        GiveawayFactory.Tier[] memory tiers,
        uint256 entryFee
    ) internal returns (Giveaway giveaway) {
        vm.prank(sponsor);
        address addr = factory.create(
            address(prize), tiers, entryFee, uint64(block.timestamp + 2 hours)
        );
        giveaway = Giveaway(addr);
    }

    /// @dev Deploy + send prize tokens so push-payout in selectWinners succeeds.
    function _deployFunded(
        GiveawayFactory.Tier[] memory tiers,
        uint256 entryFee
    ) internal returns (Giveaway giveaway) {
        giveaway = _deploy(tiers, entryFee);
        uint256 totalPrize;
        for (uint256 i = 0; i < tiers.length; i++) totalPrize += tiers[i].amount;
        vm.prank(sponsor);
        prize.transfer(address(giveaway), totalPrize);
    }

    function _approveAndEnter(Giveaway giveaway, address entrant, uint256 fee) internal {
        vm.prank(entrant);
        usdt.approve(address(giveaway), fee);
        vm.prank(entrant);
        giveaway.enter();
    }

    function testCreateStartsOpenWithoutFunds() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        Giveaway giveaway = _deploy(tiers, 1e18);

        (uint8 status, , , , , ) = giveaway.getState();
        assertEq(status, STATUS_OPEN);
        // No prize tokens have been moved — admin funds later.
        assertEq(prize.balanceOf(address(giveaway)), 0);
    }

    function testEntriesWorkWithoutPrizeFunds() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        Giveaway giveaway = _deploy(tiers, 1e18);

        _approveAndEnter(giveaway, entrant1, 1e18);

        // Entry fees DO move (entrant pays in entry token) — but prize token balance stays 0.
        assertTrue(giveaway.hasEntered(entrant1));
        assertEq(usdt.balanceOf(address(giveaway)), 1e18);
        assertEq(prize.balanceOf(address(giveaway)), 0);
    }

    function testEnterAndPreventDoubleEntry() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](3);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 300_000_000});
        tiers[1] = GiveawayFactory.Tier({rank: 2, amount: 200_000_000});
        tiers[2] = GiveawayFactory.Tier({rank: 3, amount: 100_000_000});

        Giveaway giveaway = _deployFunded(tiers, 1e18);

        _approveAndEnter(giveaway, entrant1, 1e18);

        assertTrue(giveaway.hasEntered(entrant1));
        assertEq(usdt.balanceOf(address(giveaway)), 1e18);
        assertEq(prize.balanceOf(address(giveaway)), 600_000_000);

        vm.prank(entrant1);
        vm.expectRevert(bytes("already entered"));
        giveaway.enter();
    }

    function testAdminSelectWinnersFundedPath() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](2);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 300_000_000});
        tiers[1] = GiveawayFactory.Tier({rank: 2, amount: 200_000_000});

        Giveaway giveaway = _deployFunded(tiers, 1e18);

        _approveAndEnter(giveaway, entrant1, 1e18);
        _approveAndEnter(giveaway, entrant2, 1e18);
        _approveAndEnter(giveaway, entrant3, 1e18);

        vm.warp(block.timestamp + 3 hours);

        address[] memory selectedWinners = new address[](2);
        selectedWinners[0] = entrant2;
        selectedWinners[1] = entrant1;

        vm.prank(sponsor);
        giveaway.selectWinners(selectedWinners);

        (uint8 status, , , , , ) = giveaway.getState();
        assertEq(status, STATUS_RESOLVED);

        // 1st place gets only the tier amount; bonus pool is removed.
        // Entry fees stay in the contract for the sponsor to claim later.
        assertEq(prize.balanceOf(entrant2), 300_000_000);
        assertEq(usdt.balanceOf(entrant2), 10_000e18 - 1e18);
        assertEq(prize.balanceOf(entrant1), 200_000_000);
        assertEq(usdt.balanceOf(entrant1), 10_000e18 - 1e18);
        // 3 ticket fees (3e18) remain in contract for sponsor revenue.
        assertEq(usdt.balanceOf(address(giveaway)), 3e18);
    }

    /// @dev Sponsor funds the contract AFTER selectWinners — winners use the
    ///      claim() pull-payment path. This is the "automation" flow the user
    ///      will eventually wire up.
    function testAdminSelectWinnersThenFundsLater() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 300_000_000});

        Giveaway giveaway = _deploy(tiers, 1e18);

        _approveAndEnter(giveaway, entrant1, 1e18);

        vm.warp(block.timestamp + 3 hours);

        address[] memory selectedWinners = new address[](1);
        selectedWinners[0] = entrant1;

        vm.prank(sponsor);
        giveaway.selectWinners(selectedWinners);

        // Prize transfer in selectWinners reverted (contract has 0 prize tokens),
        // so the amount fell through to unclaimedPrize.
        assertEq(prize.balanceOf(entrant1), 0);
        assertEq(giveaway.unclaimedPrize(entrant1), 300_000_000);

        // Sponsor sends prize tokens AFTER the selection — now claim() can settle.
        vm.prank(sponsor);
        prize.transfer(address(giveaway), 300_000_000);

        vm.prank(entrant1);
        giveaway.claim();

        assertEq(prize.balanceOf(entrant1), 300_000_000);
        assertEq(giveaway.unclaimedPrize(entrant1), 0);
    }

    function testNonAdminCannotSelectWinners() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        Giveaway giveaway = _deployFunded(tiers, 0);

        vm.prank(entrant1);
        giveaway.enter();
        vm.warp(block.timestamp + 2 hours);

        address[] memory selectedWinners = new address[](1);
        selectedWinners[0] = entrant1;
        vm.prank(entrant1);
        vm.expectRevert();
        giveaway.selectWinners(selectedWinners);
    }

    function testCannotSelectNonEntrantAsWinner() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        Giveaway giveaway = _deployFunded(tiers, 0);

        vm.prank(entrant1);
        giveaway.enter();
        vm.warp(block.timestamp + 2 hours);

        address[] memory selectedWinners = new address[](1);
        selectedWinners[0] = entrant2;
        vm.prank(sponsor);
        vm.expectRevert(bytes("selected winner is not an entrant"));
        giveaway.selectWinners(selectedWinners);
    }

    function testCancelOpenRefundsSponsorAndEntrants() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](2);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 300_000_000});
        tiers[1] = GiveawayFactory.Tier({rank: 2, amount: 200_000_000});

        uint256 sponsorBefore = prize.balanceOf(sponsor);
        Giveaway giveaway = _deployFunded(tiers, 1e18);

        _approveAndEnter(giveaway, entrant1, 1e18);
        _approveAndEnter(giveaway, entrant2, 1e18);

        uint256 e1After = usdt.balanceOf(entrant1);
        uint256 e2After = usdt.balanceOf(entrant2);

        vm.prank(sponsor);
        giveaway.cancel();

        // Sponsor gets back the prize tokens they sent
        assertEq(prize.balanceOf(sponsor), sponsorBefore);
        assertEq(usdt.balanceOf(entrant1), e1After + 1e18);
        assertEq(usdt.balanceOf(entrant2), e2After + 1e18);
        assertEq(prize.balanceOf(address(giveaway)), 0);
        assertEq(usdt.balanceOf(address(giveaway)), 0);
    }

    function testCancelOnlyOwner() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        Giveaway giveaway = _deploy(tiers, 0);

        vm.prank(entrant1);
        vm.expectRevert();
        giveaway.cancel();
    }

    function testCannotCancelAfterResolution() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        Giveaway giveaway = _deployFunded(tiers, 0);

        vm.prank(entrant1);
        giveaway.enter();
        vm.warp(block.timestamp + 3 hours);

        address[] memory selectedWinners = new address[](1);
        selectedWinners[0] = entrant1;
        vm.prank(sponsor);
        giveaway.selectWinners(selectedWinners);

        vm.prank(sponsor);
        vm.expectRevert(bytes("giveaway not cancellable"));
        giveaway.cancel();
    }

    function testRescueTokensBlocksPrizeAndEntryToken() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        Giveaway giveaway = _deployFunded(tiers, 1e18);

        vm.prank(sponsor);
        vm.expectRevert(bytes("cannot rescue prize token"));
        giveaway.rescueTokens(IERC20(address(prize)), sponsor, 100_000_000);

        vm.prank(sponsor);
        vm.expectRevert(bytes("cannot rescue entry token"));
        giveaway.rescueTokens(IERC20(address(usdt)), sponsor, 1e18);
    }

    function testRescueTokensRecoversStrayToken() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        Giveaway giveaway = _deploy(tiers, 0);

        ERC20Mock stray = new ERC20Mock();
        stray.mint(address(giveaway), 7_777);

        vm.prank(sponsor);
        giveaway.rescueTokens(IERC20(address(stray)), sponsor, 7_777);

        assertEq(stray.balanceOf(sponsor), 7_777);
        assertEq(stray.balanceOf(address(giveaway)), 0);
    }
}
