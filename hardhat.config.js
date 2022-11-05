require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("dotenv").config();

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYSCAN_API_KEY = process.env.POLYSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: "0.8.17",
	defaultNetwork:"hardhat",
	networks: {
		hardhat: {
			chainId: 1337,
			blockConfirmations: 1,
		},
		localhost: {
			chainId: 1337,
			blockConfirmations: 1,
		},
		mumbai: {
			chainId: 80001,
			blockConfirmations: 6,
			url: POLYGON_RPC_URL,
			accounts:[PRIVATE_KEY]
		},
	},
	namedAccounts: {
		deployer: {
			default:0
		},
		notDeployer: {
			default:1
		},
		secondNonDeployer: {
			default:2
		},
		thirdNonDeployer: {
			default:3
		}
	},
	etherscan: {
		apiKey:POLYSCAN_API_KEY
	},
	mocha: {
		timeout:500000 // 500 seconds.
	}
};
