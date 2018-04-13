const TestRPC = require("ethereumjs-testrpc");

module.exports = {
    networks: {
        test: {
            network_id: "*",
			gasLimit: 10000000,
            provider: TestRPC.provider({
                accounts: Array(12 + 1000).fill(0).map(() => ({balance: 10000 * 10**18})),
                time: new Date(1523887200000)
            })
        },
        localhost: {
            host: "localhost",
            port: 8545,
            network_id: "*" // Match any network id
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    network: 'test',
    mocha: {
        bail: true,
        fullTrace: true,
    }
};
