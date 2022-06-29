import { Contract, providers, utils} from "ethers"
import Head from"next/head"
import React, { useEffect, useRef, useState } from "react"
import Web3Modal from "web3modal"
import styles from "../styles/Home.module.css"
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import { sign } from "crypto"

export default function Home(){
  //walleconnect
  const [walletConnected, setWallectConnected] = useState(false);

  //presaleStarted
  const [presaleStarted, setPresaleStarted] = useState(false);

  //presaleEnded
  const [presaleEnded, setPresaleEnded] = useState(false);

  //loading, set to true when a trx is being mined
  const [loading, setLoading] = useState(false);

  //check if the current metamask is the owner
  const [isOwner, setIsOwner] = useState(false);

  //tokenIdsMinted, number of tokens minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");

  //Creates a reference state of web3modal used for connecting to metamask
  const web3ModalRef = useRef();


  const getProviderOrSigner = async (needSigner = false) => {
    //connect to metamask 
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    //check if user is connected to right network(rinkeby)
    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== 4) {
      Window.alert("Change to the rinkeby network");
      throw new Error("Change to rinkeby network");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  };

  const getOwner = async () => {
    try {
      //get the provider and the signer
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);

      //get the address of current signer logged in to metamask
      const address = await signer.getAddress();

      //get the NFT contract with only read access
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      //call the owner function from contract
      const _owner = await nftContract.owner();

      //check if signer === owner adress
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }else{
        console.log("Error invalid entry")
      }

    } catch (error) {
      console.log(error)
    }
  }

  const getTokensIdMinted = async () => {
    try {
      //get provider
      const provider = await getProviderOrSigner();

      //get the NFT contract with read access
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      //get the tokenIds from contract
      const _tokenIds = await nftContract.tokenIds();

      //set tokenIds state, _tokenIds is a big number we need to convert to string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (error) {
      console.log(error)
    }
  }

  const checkIfPresaleStarted = async () => {
    try {
      //get provider and nft contract
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      //call the presale started from contract
      const _presaleStarted = await nftContract.presaleStarted();

      if (!_presaleStarted) {
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted

    } catch (error) {
      console.log(error)
      return false;
    }
  }

  const checkIfPresaleEnded = async () => {
    try {
      //get provider and nft contract 
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      //call the presaleEnded function from the contract
      const _presaleEnded = await nftContract.presaleEnded();

      //check if presale has ended by comparing _presaleEnded < current time 
      //because _presaleEnded is a big number we use.it() over '<'
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));

      if (hasEnded) {
        setPresaleEnded(true)
      } else {
        setPresaleEnded(false)
      }

      return hasEnded
    } catch (error) {
      console.log(error)
      return false
    }
  }

  const connectWallet = async () => {
    try {
      //get provider and connectwallet
      //when used for the first time, it prompts the user to connect wallet
      await getProviderOrSigner();
      setWallectConnected(true);
    } catch (error) {
      console.log(error)
    }
  }

  const startPresale = async () => {
    try {
      //get signer because we need to write to contract, 
      //get contract address(you have to be whitelisted to start presale)
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      //call presaleStart tx
      const tx = await whitelistContract.startPresale();

      setLoading(true);
      await tx.wait();
      setLoading(false);

      //set presaleStarted to true
      await checkIfPresaleStarted();
    } catch (error) {
      console.log(error)
    }
  }

  const publicMint = async () => {
    try {
      //get signer because we need to write to contract, 
      //get contract address(you have to be whitelisted to start presale)
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      //call presaleStart tx
      const tx = await whitelistContract.mint({
        //value is 0.01 which is the price of one crypto dev
        value: utils.parseEther("0.01")
      })

      setLoading(true);
      await tx.wait();
      setLoading(false);

      window.alert("You have Minted one crypto dev, Congratulations")
    } catch (error) {
      console.log(error)
    }
  };

  const presaleMint = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      const signer = await getProviderOrSigner(true);
      // Create a new instance of the Contract with a Signer, which allows
      // update methods
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // call the presaleMint from the contract, only whitelisted addresses would be able to mint
      const tx = await whitelistContract.presaleMint({
        // value signifies the cost of one crypto dev which is "0.01" eth.
        // We are parsing `0.01` string to ether using the utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!walletConnected) {
      //assign web3modal class to the reference object
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false
      });

      connectWallet();

      //check if the presale has started and ended
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokensIdMinted();

      //Set an interval which gets called every 5 seconds to check presale has ended
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);

      //set an interval to get the number of tokenIds minted every 5 seconds
      setInterval(async function () {
        await getTokensIdMinted();
      }, 5 * 1000);
    }
  }, [walletConnected])

  //renderButton() returns a button depending on the current state of the dapp
  const renderButton = () => {
    //if wallet not connected show a button to allow them connect
    if (!walletConnected) {
      return(
        <button onClick={connectWallet} className={styles.button}>Connect Your Wallet</button>
      );
    }

    //if we are waiting for something loadin
    if (loading) {
      return(
        <button className={styles.button}>Loading</button>
      );
    }

    //if connected user is the owner and presale has not started
    if (isOwner && !presaleStarted) {
      return(
        <button onClick={startPresale} className={styles.button}>Start Presale</button>
      );
    }

    //if connected user is not the owner and presale has not started
    if (!presaleStarted) {
      return(
        <button className={styles.description}>Presale has not started!</button>
      );
    }

    //if presale has started, but has not ended allow for presale minting
    if (presaleStarted && !presaleEnded) {
      return(
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a
            Crypto Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    };
  }

  return(
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
    )
}
