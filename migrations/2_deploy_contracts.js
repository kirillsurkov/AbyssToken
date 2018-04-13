const TheAbyssDAICO = artifacts.require("TheAbyssDAICO");
const BNBToken = artifacts.require("BNBToken");
const AbyssToken = artifacts.require("AbyssToken");
const LockedTokens = artifacts.require("LockedTokens");
const PollManagedFund = artifacts.require("PollManagedFund");
const ReservationFund = artifacts.require("ReservationFund");

module.exports = (deployer, _, accounts) => {
    let bnbToken;
    let abyssToken;
    let lockedTokens;
    let pollManagedFund;
    let reservationFund;
    let theAbyssDAICO;
    let owners = [accounts[0]];
    const listener = 0;//accounts[1];
    const manager = accounts[2];
    const teamWallet = accounts[3];
    const referralTokenWallet = accounts[4];
    const foundationTokenWallet = accounts[5];
    const companyTokenWallet = accounts[6];
    const reserveTokenWallet = accounts[7];
    const bountyTokenWallet = accounts[8];
    const advisorsTokenWallet = accounts[9];
    const bnbTokenWallet = accounts[11];
    deployer.deploy(BNBToken).then(() => BNBToken.deployed()).then(_bnbToken => {
        bnbToken = _bnbToken;
        return deployer.deploy(AbyssToken, listener, owners, manager);
    }).then(() => AbyssToken.deployed()).then(_abyssToken => {
        abyssToken = _abyssToken;
        return deployer.deploy(PollManagedFund, teamWallet, referralTokenWallet, foundationTokenWallet, companyTokenWallet, reserveTokenWallet, bountyTokenWallet, advisorsTokenWallet, owners);
    }).then(() => PollManagedFund.deployed()).then(_pollManagedFund => {
        pollManagedFund = _pollManagedFund;
        return deployer.deploy(ReservationFund, owners[0]);
    }).then(() => ReservationFund.deployed()).then(_reservationFund => {
        reservationFund = _reservationFund;
        return deployer.deploy(TheAbyssDAICO, bnbToken.address, abyssToken.address, pollManagedFund.address, reservationFund.address, bnbTokenWallet, referralTokenWallet, foundationTokenWallet, advisorsTokenWallet, companyTokenWallet, reserveTokenWallet, bountyTokenWallet, owners[0]);
    }).then(() => TheAbyssDAICO.deployed()).then(_theAbyssDAICO => {
        theAbyssDAICO = _theAbyssDAICO;
        return deployer.deploy(LockedTokens, abyssToken.address, theAbyssDAICO.address);
    }).then(() => LockedTokens.deployed()).then(_lockedTokens => {
        lockedTokens = _lockedTokens;
        return theAbyssDAICO.setLockedTokens(lockedTokens.address);
    }).then(() => {
        owners.push(theAbyssDAICO.address);
        owners.push(pollManagedFund.address);
        return abyssToken.setOwners(owners, {from: owners[0]});
    }).then(() => {
        return pollManagedFund.setTokenAddress(abyssToken.address);
    }).then(() => {
        return pollManagedFund.setCrowdsaleAddress(theAbyssDAICO.address);
    }).then(() => {
        return reservationFund.setCrowdsaleAddress(theAbyssDAICO.address);
    });
};
