import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AavegotchiFacet, BridgeGotchichainSide, BridgePolygonSide, DAOFacet, ERC20MintableBurnable, PolygonXGotchichainBridgeFacet, ShopFacet, SvgFacet } from "../typechain";
const LZEndpointMockCompiled = require("@layerzerolabs/solidity-examples/artifacts/contracts/mocks/LZEndpointMock.sol/LZEndpointMock.json")
const diamond = require("../js/diamond-util/src/index.js");

describe("Bridge ERC721: ", function () {
  const chainId_A = 1
  const chainId_B = 2
  const minGasToStore = 200000
  const batchSizeLimit = 1
  const defaultAdapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 350000])

  let LZEndpointMock: any, bridgePolygonSide: BridgePolygonSide, bridgeGotchichainSide: BridgeGotchichainSide
  let owner: SignerWithAddress, alice: SignerWithAddress
  let lzEndpointMockA: any, lzEndpointMockB: any
  let shopFacetPolygonSide: ShopFacet, shopFacetGotchichainSide: ShopFacet
  let aavegotchiFacetPolygonSide: AavegotchiFacet, aavegotchiFacetGotchichainSide: AavegotchiFacet
  let bridgeFacetPolygonSide: PolygonXGotchichainBridgeFacet, bridgeFacetGotchichainSide: PolygonXGotchichainBridgeFacet
  

  beforeEach(async function () {
    owner = (await ethers.getSigners())[0];
    alice = (await ethers.getSigners())[1];

    ;({ shopFacet: shopFacetPolygonSide, aavegotchiFacet: aavegotchiFacetPolygonSide, polygonXGotchichainBridgeFacet: bridgeFacetPolygonSide } = await deployAavegotchiContracts(owner.address))
    ;({ shopFacet: shopFacetGotchichainSide, aavegotchiFacet: aavegotchiFacetGotchichainSide, polygonXGotchichainBridgeFacet: bridgeFacetGotchichainSide } = await deployAavegotchiContracts(owner.address))

    LZEndpointMock = await ethers.getContractFactory(LZEndpointMockCompiled.abi, LZEndpointMockCompiled.bytecode)
    const BridgePolygonSide = await ethers.getContractFactory("BridgePolygonSide");
    const BridgeGotchichainSide = await ethers.getContractFactory("BridgeGotchichainSide");

    //Deploying LZEndpointMock contracts
    lzEndpointMockA = await LZEndpointMock.deploy(chainId_A)
    lzEndpointMockB = await LZEndpointMock.deploy(chainId_B)

    //Deploying bridge contracts
    bridgePolygonSide = await BridgePolygonSide.deploy(minGasToStore, lzEndpointMockA.address, aavegotchiFacetPolygonSide.address)
    bridgeGotchichainSide = await BridgeGotchichainSide.deploy(minGasToStore, lzEndpointMockB.address, aavegotchiFacetGotchichainSide.address)

    //Wire the lz endpoints to guide msgs back and forth
    lzEndpointMockA.setDestLzEndpoint(bridgeGotchichainSide.address, lzEndpointMockB.address)
    lzEndpointMockB.setDestLzEndpoint(bridgePolygonSide.address, lzEndpointMockA.address)

    //Set each contracts source address so it can send to each other
    await bridgePolygonSide.setTrustedRemote(chainId_B, ethers.utils.solidityPack(["address", "address"], [bridgeGotchichainSide.address, bridgePolygonSide.address]))
    await bridgeGotchichainSide.setTrustedRemote(chainId_A, ethers.utils.solidityPack(["address", "address"], [bridgePolygonSide.address, bridgeGotchichainSide.address]))

    //Set batch size limit
    await bridgePolygonSide.setDstChainIdToBatchLimit(chainId_B, batchSizeLimit)
    await bridgeGotchichainSide.setDstChainIdToBatchLimit(chainId_A, batchSizeLimit)

    //Set min dst gas for swap
    await bridgePolygonSide.setMinDstGas(chainId_B, 1, 150000)
    await bridgeGotchichainSide.setMinDstGas(chainId_A, 1, 150000)

    //Set layer zero bridge on facet
    await bridgeFacetPolygonSide.setLayerZeroBridge(bridgePolygonSide.address)
    await bridgeFacetGotchichainSide.setLayerZeroBridge(bridgeGotchichainSide.address)
  })

  it("ShopFacet - mintPortals() - Should mint portal", async function () {
    const tokenId = 0

    await shopFacetPolygonSide.mintPortals(owner.address, 1)
    await aavegotchiFacetPolygonSide.approve(bridgePolygonSide.address, tokenId)
    
    //Estimate nativeFees
    let nativeFee = (await bridgePolygonSide.estimateSendFee(chainId_B, owner.address, tokenId, false, defaultAdapterParams)).nativeFee

    //Swaps token to other chain
    const sendFromTx = await bridgePolygonSide.sendFrom(
      owner.address,
      chainId_B,
      owner.address,
      tokenId,
      owner.address,
      ethers.constants.AddressZero,
      defaultAdapterParams,
      { value: nativeFee }
    )
    await sendFromTx.wait()

    //Token is now owned by the proxy contract, because this is the original nft chain
    expect(await aavegotchiFacetPolygonSide.ownerOf(tokenId)).to.equal(bridgePolygonSide.address)

    //Token received on the dst chain
    expect(await aavegotchiFacetGotchichainSide.ownerOf(tokenId)).to.be.equal(owner.address)

    // let gotchiOwner = await aavegotchiFacetPolygonSide.ownerOf(tokenId)
    // gotchiOwner = await aavegotchiFacetPolygonSide.ownerOf(tokenId)
  })
})

async function deployAavegotchiContracts(ownerAddress: string) {

  const name = "Aavegotchi";
  const symbol = "GOTCHI";

  const childChainManager = "0xb5505a6d998549090530911180f38aC5130101c6"; // todo
  const linkAddress = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB"; // todo
  const vrfCoordinator = "0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9"; // todo
  const keyHash =
    "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4"; // todo
  const fee = ethers.utils.parseEther("0.0001");

  const dao = ownerAddress; // 'todo'
  const daoTreasury = ownerAddress;
  const rarityFarming = ownerAddress; // 'todo'
  const pixelCraft = ownerAddress; // 'todo'
  const itemManagers = [ownerAddress]; // 'todo'

  const ghstTokenContract = (await (
    await ethers.getContractFactory("ERC20MintableBurnable")
  ).deploy()) as ERC20MintableBurnable;
  const ghstDiamondAddress = ghstTokenContract.address;

  async function deployFacets(...facets: any[]) {
    const instances = [];
    for (let facet of facets) {
      let constructorArgs = [];
      if (Array.isArray(facet)) {
        [facet, constructorArgs] = facet;
      }
      const factory = await ethers.getContractFactory(facet);
      const facetInstance = await factory.deploy(...constructorArgs);
      await facetInstance.deployed();
      const tx = facetInstance.deployTransaction;
      await tx.wait();
      instances.push(facetInstance);
    }
    return instances;
  }

  let [
    bridgeFacet,
    polygonXGotchichainBridgeFacet,
    aavegotchiFacet,
    aavegotchiGameFacet,
    svgFacet,
    itemsFacet,
    itemsTransferFacet,
    collateralFacet,
    daoFacet,
    vrfFacet,
    shopFacet,
    metaTransactionsFacet,
    erc1155MarketplaceFacet,
    erc721MarketplaceFacet,
    escrowFacet,
    gotchiLendingFacet,
    lendingGetterAndSetterFacet,
    marketplaceGetterFacet,
    svgViewsFacet,
    wearableSetsFacet,
    whitelistFacet,
    peripheryFacet,
    merkleDropFacet,
  ] = await deployFacets(
    "contracts/Aavegotchi/facets/BridgeFacet.sol:BridgeFacet",
    "contracts/Aavegotchi/facets/PolygonXGotchichainBridgeFacet.sol:PolygonXGotchichainBridgeFacet",
    "contracts/Aavegotchi/facets/AavegotchiFacet.sol:AavegotchiFacet",
    "AavegotchiGameFacet",
    "SvgFacet",
    "contracts/Aavegotchi/facets/ItemsFacet.sol:ItemsFacet",
    "ItemsTransferFacet",
    "CollateralFacet",
    "DAOFacet",
    "VrfFacet",
    "ShopFacet",
    "MetaTransactionsFacet",
    "ERC1155MarketplaceFacet",
    "ERC721MarketplaceFacet",
    "EscrowFacet",
    "GotchiLendingFacet",
    "LendingGetterAndSetterFacet",
    "MarketplaceGetterFacet",
    "SvgViewsFacet",
    "WearableSetsFacet",
    "WhitelistFacet",
    "PeripheryFacet",
    "MerkleDropFacet"
  );

  const aavegotchiDiamond = await diamond.deploy({
    diamondName: "AavegotchiDiamond",
    initDiamond: "contracts/Aavegotchi/InitDiamond.sol:InitDiamond",
    facets: [
      ["BridgeFacet", bridgeFacet],
      ["PolygonXGotchichainBridgeFacet", polygonXGotchichainBridgeFacet],
      ["AavegotchiFacet", aavegotchiFacet],
      ["AavegotchiGameFacet", aavegotchiGameFacet],
      ["SvgFacet", svgFacet],
      ["ItemsFacet", itemsFacet],
      ["ItemsTransferFacet", itemsTransferFacet],
      ["CollateralFacet", collateralFacet],
      ["DAOFacet", daoFacet],
      ["VrfFacet", vrfFacet],
      ["ShopFacet", shopFacet],
      ["MetaTransactionsFacet", metaTransactionsFacet],
      ["ERC1155MarketplaceFacet", erc1155MarketplaceFacet],
      ["ERC721MarketplaceFacet", erc721MarketplaceFacet],
      ["EscrowFacet", escrowFacet],
      ["GotchiLendingFacet", gotchiLendingFacet],
      ["LendingGetterAndSetterFacet", lendingGetterAndSetterFacet],
      ["MarketplaceGetterFacet", marketplaceGetterFacet],
      ["SvgViewsFacet", svgViewsFacet],
      ["WearableSetsFacet", wearableSetsFacet],
      ["WhitelistFacet", whitelistFacet],
      ["PeripheryFacet", peripheryFacet],
      ["MerkleDropFacet", merkleDropFacet],
    ],
    owner: ownerAddress,
    args: [
      [
        dao,
        daoTreasury,
        rarityFarming,
        pixelCraft,
        ghstDiamondAddress,
        keyHash,
        fee,
        vrfCoordinator,
        linkAddress,
        childChainManager,
        name,
        symbol,
      ],
    ],
  });

  let totalGasUsed = ethers.BigNumber.from("0");
  let tx;
  let receipt;

  const gasLimit = 12300000;

  // get facets
  daoFacet = await ethers.getContractAt("DAOFacet", aavegotchiDiamond.address);
  shopFacet = await ethers.getContractAt(
    "ShopFacet",
    aavegotchiDiamond.address
  );
  aavegotchiFacet = await ethers.getContractAt(
    "contracts/Aavegotchi/facets/AavegotchiFacet.sol:AavegotchiFacet",
    aavegotchiDiamond.address
  );
  polygonXGotchichainBridgeFacet = await ethers.getContractAt(
    "PolygonXGotchichainBridgeFacet",
    aavegotchiDiamond.address
  );

  // add item managers
  tx = await daoFacet.addItemManagers(itemManagers, { gasLimit: gasLimit });
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Adding item manager failed: ${tx.hash}`);
  }

  // create new haunt and upload payloads
  let initialHauntSize = "10000";
  let portalPrice = ethers.utils.parseEther("100");
  tx = await daoFacet.createHaunt(initialHauntSize, portalPrice, "0x000000", {
    gasLimit: gasLimit,
  });
  receipt = await tx.wait();
  totalGasUsed = totalGasUsed.add(receipt.gasUsed);

  return {
    shopFacet,
    aavegotchiFacet,
    polygonXGotchichainBridgeFacet
  }
}