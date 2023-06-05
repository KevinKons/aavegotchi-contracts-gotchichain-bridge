import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AavegotchiFacet, DAOFacet, ERC20MintableBurnable, ShopFacet, SvgFacet } from "../typechain";
const LZEndpointMockCompiled = require("@layerzerolabs/solidity-examples/artifacts/contracts/mocks/LZEndpointMock.sol/LZEndpointMock.json")
const diamond = require("../js/diamond-util/src/index.js");

describe("Bridge ERC721: ", function () {
  const chainId_A = 1
  const chainId_B = 2
  const minGasToStore = 200000
  const batchSizeLimit = 1
  const defaultAdapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 350000])

  let LZEndpointMock: any, BridgePolygonSide, BridgeGotchichainSide
  let owner: SignerWithAddress, alice: SignerWithAddress
  let lzEndpointMockA, lzEndpointMockB, shopFacetPolygonSide: ShopFacet, shopFacetGotchichainSide: ShopFacet, aavegotchiFacetPolygonSide: AavegotchiFacet, aavegotchiFacetGotchichainSide: AavegotchiFacet
  

  beforeEach(async function () {
    owner = (await ethers.getSigners())[0];
    alice = (await ethers.getSigners())[1];

    ;({ shopFacet: shopFacetPolygonSide, aavegotchiFacet: aavegotchiFacetPolygonSide } = await deployAavegotchiContracts(owner.address))
    ;({ shopFacet: shopFacetGotchichainSide, aavegotchiFacet: aavegotchiFacetGotchichainSide } = await deployAavegotchiContracts(owner.address))

    LZEndpointMock = await ethers.getContractFactory(LZEndpointMockCompiled.abi, LZEndpointMockCompiled.bytecode)
    BridgePolygonSide = await ethers.getContractFactory("BridgePolygonSide");
    BridgeGotchichainSide = await ethers.getContractFactory("BridgeGotchichainSide");

    //Deploying LZEndpointMock contracts
    lzEndpointMockA = await LZEndpointMock.deploy(chainId_A)
    lzEndpointMockB = await LZEndpointMock.deploy(chainId_B)

    //Deploying bridge contracts
    BridgePolygonSide = await BridgePolygonSide.deploy(minGasToStore, lzEndpointMockA.address, aavegotchiFacetPolygonSide.address)
    BridgeGotchichainSide = await BridgeGotchichainSide.deploy(minGasToStore, lzEndpointMockB.address, aavegotchiFacetGotchichainSide.address)

    //Wire the lz endpoints to guide msgs back and forth
    lzEndpointMockA.setDestLzEndpoint(BridgeGotchichainSide.address, lzEndpointMockB.address)
    lzEndpointMockB.setDestLzEndpoint(BridgePolygonSide.address, lzEndpointMockA.address)

    //Set each contracts source address so it can send to each other
    await BridgePolygonSide.setTrustedRemote(chainId_B, ethers.utils.solidityPack(["address", "address"], [BridgeGotchichainSide.address, BridgePolygonSide.address]))
    await BridgeGotchichainSide.setTrustedRemote(chainId_A, ethers.utils.solidityPack(["address", "address"], [BridgePolygonSide.address, BridgeGotchichainSide.address]))

    //Set batch size limit
    await BridgePolygonSide.setDstChainIdToBatchLimit(chainId_B, batchSizeLimit)
    await BridgeGotchichainSide.setDstChainIdToBatchLimit(chainId_A, batchSizeLimit)

    //set min dst gas for swap
    await BridgePolygonSide.setMinDstGas(chainId_B, 1, 150000)
    await BridgeGotchichainSide.setMinDstGas(chainId_A, 1, 150000)
  })

  it("ShopFacet - mintPortals() - Should mint portal", async function () {
    await shopFacetPolygonSide.mintPortals(owner.address, 1)

    let gotchiOwner = await aavegotchiFacetPolygonSide.ownerOf(0)
    console.log({gotchiOwner})

    await aavegotchiFacetPolygonSide.transferFrom(owner.address, alice.address, 0)

    gotchiOwner = await aavegotchiFacetPolygonSide.ownerOf(0)
    console.log({gotchiOwner})
  })
})

function addCommas(nStr) {
  nStr += "";
  const x = nStr.split(".");
  let x1 = x[0];
  const x2 = x.length > 1 ? "." + x[1] : "";
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, "$1" + "," + "$2");
  }
  return x1 + x2;
}

function strDisplay(str) {
  return addCommas(str.toString());
}

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
  console.log("GHST address:" + ghstDiamondAddress);

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
      const receipt = await tx.wait();
      console.log(`${facet} deploy gas used:` + strDisplay(receipt.gasUsed));
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
  console.log("Aavegotchi diamond address:" + aavegotchiDiamond.address);

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

  // add item managers
  console.log("Adding item managers");
  tx = await daoFacet.addItemManagers(itemManagers, { gasLimit: gasLimit });
  console.log("Adding item managers tx:", tx.hash);
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
  console.log("Haunt created:" + strDisplay(receipt.gasUsed));
  totalGasUsed = totalGasUsed.add(receipt.gasUsed);

  return {
    shopFacet,
    aavegotchiFacet,
  }
}