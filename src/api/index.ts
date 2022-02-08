import Web3 from 'web3';
import { v4 as uuidv4 } from 'uuid';

import { CONTACT_ABI, CONTACT_ADDRESS } from '../constants';
import { getCitizensIdsToSearch } from './utils';
import { Citizen } from '../types';
import { setAccount } from '../redux/reducers/actions';


const NOT_FOUND = 'City not found';
const WRONG_FORMAT_MESSAGE = 'Decoded with wrong format.'

// const provider = 
//     (window as any).ethereum || 
//     (window as any).web3?.currentProvider;

let web3:any;
let web3Add:any;
let gas_price:any = 0.000000002425000008;
//const contract = new web3.eth.Contract(CONTACT_ABI as any, CONTACT_ADDRESS);
let selectedAccount:any;
let selectedAccountAdd:any;

// let nftContract;
let contract:any;
let contractAdd:any;

let isInitializedAdd = false;

let isInitialized = false;

export const init = async (dispatch:any) => {
	let provider = (window as any).ethereum;
	//web3 = new Web3(provider);
   web3 = new Web3("https://citizen-uae-worker.bibinprathap.workers.dev");
	//web3 = new Web3("https://eth-ropsten.alchemyapi.io/v2/CBvfp4JoQkhatK3Hoxh2GCV4mTgYvJWa");

	if (typeof provider !== 'undefined') {
		provider
			.request({ method: 'eth_requestAccounts' })
			.then((accounts:any) => {
				selectedAccount = accounts[0];
                contract = new web3.eth.Contract(
                    CONTACT_ABI as any,
                    selectedAccount
                );
                dispatch(setAccount(selectedAccount));

				console.log(`Selected account is ${selectedAccount}`);
			})
			.catch((err:any) => {
				console.log(err);
				return;
			});

            (window as any).ethereum.on('accountsChanged', function (accounts:any) {
			selectedAccount = accounts[0];
            contract = new web3.eth.Contract(
                CONTACT_ABI as any,
                selectedAccount
            );
            dispatch(setAccount(selectedAccount));
			console.log(`Selected account changed to ${selectedAccount}`);
		});
	}


	const networkId = await web3.eth.net.getId();
	// web3.eth.get_transaction_by_block(selectedAccount).then((result:any) => {
		 
	//   console.log("get_block_transaction_count: ",result);
	// })
   
	web3.eth.getBlockNumber().then(async (block:any) => {
		const txCount = await web3.eth.getBlockTransactionCount(block);
		/* ^^^ throws ^^^ */
	  
		console.log("get_block_transaction_count: ",txCount);
	  });

	  web3.eth.getPastLogs({fromBlock:'0x1',address:selectedAccount})
.then((res:any) => {
  res.forEach((rec:any)=> {
    console.log('getPastLogs',rec.blockNumber, rec.transactionHash, rec.topics);
  });
}).catch((err:any) => console.log("getPastLogs failed", err));

	// const erc20Abi = [
	// 	{
	// 		constant: true,
	// 		inputs: [
	// 			{
	// 				name: '_owner',
	// 				type: 'address'
	// 			}
	// 		],
	// 		name: 'balanceOf',
	// 		outputs: [
	// 			{
	// 				name: 'balance',
	// 				type: 'uint256'
	// 			}
	// 		],
	// 		payable: false,
	// 		stateMutability: 'view',
	// 		type: 'function'
	// 	}
	// ];

	// erc20Contract = new web3.eth.Contract(
	// 	erc20Abi,
	// 	// Dai contract on Rinkeby
	// 	'0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'
	// );

	isInitialized = true;
};

export const initAdd = async (dispatch:any) => {
	let provider = (window as any).ethereum;
 

 	web3Add = new Web3(provider);
     
 	const networkId = await web3Add.eth.net.getId();

	contractAdd = new web3Add.eth.Contract(
		CONTACT_ABI as any,
		selectedAccount
	);

    web3Add.eth.getGasPrice().then((result:any) => {
          gas_price=web3Add.utils.fromWei(result, 'ether');
        console.log("gas price is: ",gas_price);
      })
	 
	// const erc20Abi = [
	// 	{
	// 		constant: true,
	// 		inputs: [
	// 			{
	// 				name: '_owner',
	// 				type: 'address'
	// 			}
	// 		],
	// 		name: 'balanceOf',
	// 		outputs: [
	// 			{
	// 				name: 'balance',
	// 				type: 'uint256'
	// 			}
	// 		],
	// 		payable: false,
	// 		stateMutability: 'view',
	// 		type: 'function'
	// 	}
	// ];

	// erc20Contract = new web3.eth.Contract(
	// 	erc20Abi,
	// 	// Dai contract on Rinkeby
	// 	'0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea'
	// );

	isInitializedAdd = true;
};

export const citizensAPI = {
    getCitizensCount: async (dispatch:any): Promise<number> => {
        if (!isInitialized) {
            await init(dispatch);
        }
        const events =  await contract.getPastEvents('Citizen', {
            fromBlock: 1,
            toBlock: 'latest'
        });

        return events.length;
    },

    fetchCitizens: async (page: number, limit: number, count: number,dispatch:any): Promise<Citizen[]> => {
        if (!isInitialized) {
            await init(dispatch);
        }
        const citizenIds = getCitizensIdsToSearch(page, limit, count);
        
        const events =  await contract.getPastEvents('Citizen', {
            filter: {id: citizenIds},
            fromBlock: 0,
            toBlock: 'latest'
        });

        const transactionsData = events.map(async ({ transactionHash, returnValues: { id, age, name } }) => {
            try {
                const { input }  = await web3.eth.getTransaction(transactionHash);
                const parametersTypes = [
                    { type: 'uint256', name: 'age' },
                    { type: 'string', name: 'city' },
                    { type: 'string', name: 'name' },
                ];
                const { city } = web3.eth.abi.decodeParameters(parametersTypes, input.slice(10));
                const isCityHex = web3.utils.isHex(city);

                if (isCityHex) throw new Error(WRONG_FORMAT_MESSAGE);

                return { id, age, name, city };
            } catch(error) {
                console.error(error);

                return { id, age, name, city: NOT_FOUND };
            }
        })

        return await Promise.all(transactionsData);
    },

    fetchNote: async (id: string,dispatch:any): Promise<string> => {
        if (!isInitialized) {
            await init(dispatch);
        }
        return await contract?.methods.getNoteByCitizenId(id).call();
    },

    addNewCitizen: async (citizen: any,dispatch:any): Promise<Citizen> => {
        if (!isInitializedAdd) {
            await initAdd(dispatch);
        }
        const { age, name, city, note } = citizen;
        const { events } =  await contractAdd?.methods
            .addCitizen(age, city, name, note)
            .send({ 
                from: selectedAccount
 //gas limit must be 21000. 
                //(window as any).ethereum.selectedAddress 
            });
        const id = events?.Citizen?.returnValues?.id || uuidv4();

        return { id, age, name, city };
    }
};