web3.utils = web3._extend.utils;
const BigNumber = require("bignumber.js");
const TheAbyssDAICO = artifacts.require("TheAbyssDAICO");
const BNBToken = artifacts.require("BNBToken");
const AbyssToken = artifacts.require("AbyssToken");
const LockedTokens = artifacts.require("LockedTokens");
const PollManagedFund = artifacts.require("PollManagedFund");
const ReservationFund = artifacts.require("ReservationFund");
const RefundPoll = artifacts.require("RefundPoll");
const incTime = seconds => new Promise(next =>
	web3.currentProvider.sendAsync({jsonrpc: "2.0", method: "evm_increaseTime", params: [seconds], id: 0}, () =>
		web3.currentProvider.sendAsync({jsonrpc: "2.0", method: "evm_mine", id: 0}, next)
	)
);
const getTime = () => new Promise(next => web3.eth.getBlock("latest", (err, block) => next(block.timestamp)));
const getBalance = address => new Promise(next => web3.eth.getBalance(address, (err, balance) => next(balance)));

contract("TheAbyssDAICO", accounts => {
	const tokenPriceNum = 100;
	const tokenPriceDenom = 1;

	it("test min / max contribution", async () => {
		const contract = await TheAbyssDAICO.deployed();
		const customerWL = accounts[12];
		const customerPL = accounts[13];
		await contract.setTokenPrice(tokenPriceNum, tokenPriceDenom);
		await contract.setSoftCap(web3.utils.toWei("1000", "ether"));
		await contract.setHardCap(web3.utils.toWei("110000", "ether"));
		await contract.addToWhiteList(customerWL);
		await contract.addToPrivilegedList(customerPL);
		let minContribFail = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("0.19", "ether"), from: customerWL});
		} catch(e) {
			minContribFail = true;
		}
		assert.equal(minContribFail, true);
		let minContribPass = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("0.2", "ether"), from: customerWL});
			minContribPass = true;
		} catch(e) {
		}
		assert.equal(minContribPass, true);
		let minContribPrivFail = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("99", "ether"), from: customerPL});
		} catch(e) {
			minContribPrivFail = true;
		}
		assert.equal(minContribPrivFail, true);
		let minContribPrivPass = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("100", "ether"), from: customerPL});
			minContribPrivPass = true;
		} catch(e) {
		}
		assert.equal(minContribPrivPass, true);
		let maxContribFail = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("20", "ether"), from: customerWL});
		} catch(e) {
			maxContribFail = true;
		}
		assert.equal(maxContribFail, true);
		let maxContribPass = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("19.8", "ether"), from: customerWL});
			maxContribPass = true;
		} catch(e) {
		}
		assert.equal(maxContribPass, true);
		let maxContribPrivFail = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("3000", "ether"), from: customerPL});
		} catch(e) {
			maxContribPrivFail = true;
		}
		assert.equal(maxContribPrivFail, true);
		let maxContribPrivPass = true;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("2900", "ether"), from: customerPL});
			maxContribPrivPass = true;
		} catch(e) {
		}
		assert.equal(maxContribPrivPass, true);
		await incTime(86400);
		let maxContribPassAfter1Day = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("25", "ether"), from: customerWL});
			maxContribPassAfter1Day = true;
		} catch(e) {
		}
		assert.equal(maxContribPassAfter1Day, true);
		let maxContribPrivPassAfter1Day = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("3500", "ether"), from: customerPL});
			maxContribPrivPassAfter1Day = true;
		} catch(e) {
		}
		assert.equal(maxContribPrivPassAfter1Day, true);
	});

	it("test pause / unpause", async () => {
		const contract = await TheAbyssDAICO.deployed();
		const customer = accounts[12];
		await contract.pause();
		let contribFail = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("1", "ether"), from: customer});
		} catch(e) {
			contribFail = true;
		}
		assert.equal(contribFail, true);
		await contract.unpause();
		let contribPass = false;
		try {
			await contract.sendTransaction({value: web3.utils.toWei("1", "ether"), from: customer});
			contribPass = true;
		} catch(e) {
		}
		assert.equal(contribPass, true);
	});

	it("test bonuses", async () => {
		const contract = await TheAbyssDAICO.deployed();
		const token = await AbyssToken.deployed();
		const customer = accounts[12];
		const tokens = new BigNumber(tokenPriceNum / tokenPriceDenom);
		const checkBonus = async (seconds, rate) => {
			await incTime(seconds);
			const balance = (await token.balanceOf(customer)).div(10**18);
			await contract.sendTransaction({value: web3.utils.toWei("1", "ether"), from: customer});
			const newBalance = (await token.balanceOf(customer)).div(10**18);
			assert.equal(newBalance.sub(balance).toString(), tokens.multipliedBy(rate).toString());
		};
		await checkBonus(0,         1.25);
		await checkBonus(86400,     1.15);
		await checkBonus(86400 * 5, 1.10);
		await checkBonus(86400 * 7, 1.05);
		await checkBonus(86400 * 7, 1.00);
		await contract.addAdditionalBonusMember(customer);
		await checkBonus(0,         1.03);
	});

	it("test reservation fund", async () => {
		const contract = await TheAbyssDAICO.deployed();
		const reservationFund = await ReservationFund.deployed();
		const token = await AbyssToken.deployed();
		const customer = accounts[14];
		await contract.sendTransaction({value: web3.utils.toWei("1", "ether"), from: customer});
		assert.equal((await token.balanceOf(customer)).toString(), "0");
		await contract.addToPrivilegedList(customer);
		await reservationFund.completeContribution(customer);
		assert.equal((await token.balanceOf(customer)).div(10**18).toString(), tokenPriceNum / tokenPriceDenom);
	});

	it("test limited wallets", async () => {
		const contract = await TheAbyssDAICO.deployed();
		const reservationFund = await ReservationFund.deployed();
		const token = await AbyssToken.deployed();
		const manager = accounts[2];
		const customer = accounts[15];
		const receiver = accounts[16];
		await contract.sendTransaction({value: web3.utils.toWei("1", "ether"), from: customer});
		assert.equal((await token.balanceOf(customer)).toString(), "0");
		await token.addLimitedWalletAddress(customer, {from: manager});
		await reservationFund.completeContribution(customer);
		assert.equal((await token.balanceOf(customer)).div(10**18).toString(), tokenPriceNum / tokenPriceDenom);
		let transferFail = false;
		try {
			await token.transfer(receiver, 1, {from: customer});
		} catch(e) {
			transferFail = true;
		}
		assert.equal(transferFail, true);
		await token.setAllowTransfers(true);
		await token.disableLimit({from: manager});
		let transferPass = false;
		try {
			await token.transfer(receiver, 1, {from: customer});
			transferPass = true;
		} catch(e) {
		}
		assert.equal(transferPass, true);
	});

	it("test tokens distribution", async () => {
		const contract = await TheAbyssDAICO.deployed();
		const token = await AbyssToken.deployed();
		const lockedTokens = await LockedTokens.deployed();
		const referralTokenWallet = accounts[4];
		const foundationTokenWallet = accounts[5];
		const companyTokenWallet = accounts[6];
		const reserveTokenWallet = accounts[7];
		const bountyTokenWallet = accounts[8];
		const advisorsTokenWallet = accounts[9];
		await new Promise(next => {
			let done = 0;
			for (let i = 0; i < 1000; i++) {
				contract.addToWhiteList(accounts[12+i]).then(() =>
					contract.sendTransaction({value: web3.utils.toWei("100", "ether"), from: accounts[12+i]})
				).then(() => {
					done++;
					if (done == 1000) next();
				});
			}
		});
		await incTime(86400 * 9);
		await contract.finalizeCrowdsale();
		const rawTokens = await contract.rawTokenSupply();
		const totalTokens = await token.totalSupply();
		const compare = (a, b) => parseFloat(Math.round(a.div(10**20)).toString())*10**20 == parseFloat(Math.round(b.div(10**20)).toString())*10**20;
		assert.equal(compare(rawTokens.mul(10).div(100), await token.balanceOf(referralTokenWallet)), true)
		assert.equal(compare(totalTokens.mul(30).div(100), (await lockedTokens.walletTokens(foundationTokenWallet, 0))[0]), true)
		assert.equal(compare(totalTokens.mul(15).div(100), (await lockedTokens.walletTokens(companyTokenWallet, 0))[0]), true)
		assert.equal(compare(totalTokens.mul(18).div(100), (await lockedTokens.walletTokens(reserveTokenWallet, 0))[0]), true)
		assert.equal(compare(totalTokens.mul(1).div(100), await token.balanceOf(bountyTokenWallet)), true)
		assert.equal(compare(totalTokens.mul(6).div(100), await token.balanceOf(advisorsTokenWallet)), true)
	});

	it("test refund poll", async () => {
		const contract = await TheAbyssDAICO.deployed();
		const token = await AbyssToken.deployed();
		const fund = await PollManagedFund.deployed();
		await incTime(86400 * 45);
		let pollFail = false;
		try {
			await fund.createRefundPoll({from: accounts[12]});
		} catch(e) {
			pollFail = true;
		}
		assert.equal(pollFail, true);
		await incTime(86400);
		let pollPass = false;
		try {
			await fund.createRefundPoll({from: accounts[12]});
			pollPass = true;
		} catch(e) {
		}
		assert.equal(pollPass, true);
		let poll = RefundPoll.at(await fund.refundPoll());
		await new Promise(next => {
			let done = 0;
			for (let i = 0; i < 1000; i++) {
				poll.vote(i < 658, {from: accounts[12 + i]}).then(() => {
					done++;
					if (done == 1000) next();
				});
			}
		});
		let finFail = false;
		try {
			await poll.tryToFinalize();
		} catch(e) {
			finFail = true;
		}
		assert.equal(finFail, true);
		await incTime(86400 * 31);
		let finPass = false;
		try {
			await poll.tryToFinalize();
			finPass = true;
		} catch(e) {
		}
		assert.equal(finPass, true);
		assert.equal("0", (await fund.secondRefundPollDate()).toString());
		await incTime(86400 * 61);
		await fund.createRefundPoll({from: accounts[12]});
		poll = RefundPoll.at(await fund.refundPoll());
		await new Promise(next => {
			let done = 0;
			for (let i = 0; i < 1000; i++) {
				poll.vote(i < 659, {from: accounts[12 + i]}).then(() => {
					done++;
					if (done == 1000) next();
				});
			}
		});
		await incTime(86400 * 31);
		await poll.tryToFinalize();
		await incTime(86400 * 30);
		await fund.createRefundPoll({from: accounts[12]});
		poll = RefundPoll.at(await fund.refundPoll());
		await new Promise(next => {
			let done = 0;
			for (let i = 0; i < 1000; i++) {
				poll.vote(i < 659, {from: accounts[12 + i]}).then(() => {
					done++;
					if (done == 1000) next();
				});
			}
		});
		await incTime(86400 * 7);
		await poll.tryToFinalize();
	});
});
