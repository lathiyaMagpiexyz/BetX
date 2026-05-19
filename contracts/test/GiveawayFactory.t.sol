// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import "../src/GiveawayFactory.sol";
import "../src/Giveaway.sol";

contract GiveawayFactoryTest is Test {
    ERC20Mock internal prize;
    ERC20Mock internal usdt;
    GiveawayFactory internal factory;
    address internal constant sponsor = address(0xABCD);

    function setUp() public {
        prize = new ERC20Mock();
        usdt = new ERC20Mock();
        prize.mint(sponsor, 10_000_000e6);
        // Sponsor is also the factory owner so create() (onlyOwner) can be called.
        vm.prank(sponsor);
        factory = new GiveawayFactory(address(usdt));
    }

    function testFactoryStoresEntryToken() public view {
        assertEq(factory.entryToken(), address(usdt));
    }

    function testCannotDeployFactoryWithZeroEntryToken() public {
        vm.expectRevert(bytes("entry token is zero"));
        new GiveawayFactory(address(0));
    }

    function testCreateDoesNotPullPrizeTokens() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](2);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 300_000_000});
        tiers[1] = GiveawayFactory.Tier({rank: 2, amount: 200_000_000});

        uint256 sponsorBefore = prize.balanceOf(sponsor);

        vm.prank(sponsor);
        address giveawayAddress = factory.create(address(prize), tiers, 1e18, uint64(block.timestamp + 2 hours));

        // Creation moves NO funds — sponsor's balance unchanged, new giveaway empty.
        assertEq(prize.balanceOf(sponsor), sponsorBefore);
        assertEq(prize.balanceOf(giveawayAddress), 0);

        Giveaway giveaway = Giveaway(giveawayAddress);
        (uint8 status, uint256 entryFee, , , , ) = giveaway.getState();
        assertEq(status, 0); // Open — campaigns start Open without prize funds
        assertEq(entryFee, 1e18);
        assertEq(address(giveaway.entryToken()), address(usdt));
        assertEq(address(giveaway.prizeToken()), address(prize));
    }

    function testCreateRequiresFutureEndAt() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        vm.prank(sponsor);
        vm.expectRevert(bytes("endAt must be in the future"));
        factory.create(address(prize), tiers, 0, uint64(block.timestamp));
    }

    function testCreateOnlyOwner() public {
        GiveawayFactory.Tier[] memory tiers = new GiveawayFactory.Tier[](1);
        tiers[0] = GiveawayFactory.Tier({rank: 1, amount: 100_000_000});

        // A random address that is not the factory owner cannot create
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        factory.create(address(prize), tiers, 0, uint64(block.timestamp + 2 hours));
    }

    function testRescueTokensOnlyOwner() public {
        ERC20Mock stray = new ERC20Mock();
        stray.mint(address(factory), 1_000);

        // Random caller cannot rescue
        vm.expectRevert();
        factory.rescueTokens(IERC20(address(stray)), address(this), 1_000);
    }

    function testRescueTokensRecovers() public {
        ERC20Mock stray = new ERC20Mock();
        stray.mint(address(factory), 1_234);

        // Sponsor is the factory owner now
        vm.prank(sponsor);
        factory.rescueTokens(IERC20(address(stray)), sponsor, 1_234);
        assertEq(stray.balanceOf(sponsor), 1_234);
        assertEq(stray.balanceOf(address(factory)), 0);
    }
}
