// SPDX-License-Identifier: MIT
pragma solidity 0.8.1;

import {Aavegotchi} from "../libraries/LibAppStorage.sol";
import {Modifiers} from "../libraries/LibAppStorage.sol";

contract PolygonXGotchichainBridgeFacet is Modifiers {

    address public layerZeroBridge;

    modifier onlyLayerZeroBridge() {
        require(msg.sender == layerZeroBridge, "PolygonXGotchichainBridgeFacet: Do not have access");
        _;
    }

    function setAavegotchiMetadata(uint _id, Aavegotchi memory _aavegotchi) external onlyLayerZeroBridge {
        //todo @emit transfer event?
        s.aavegotchis[_id] = _aavegotchi;
        s.tokenIds.push(uint32(_id));
        s.ownerTokenIdIndexes[_aavegotchi.owner][_id] = s.ownerTokenIds[_aavegotchi.owner].length;
        s.ownerTokenIds[_aavegotchi.owner].push(uint32(_id));
    }

    function setLayerZeroBridge(address _newLayerZeroBridge) external onlyDaoOrOwner {
        layerZeroBridge = _newLayerZeroBridge;
    }

    function getAavegotchiData(uint256 _tokenId) external view returns (Aavegotchi memory aavegotchi_) {
        aavegotchi_ = s.aavegotchis[_tokenId];
    }
}
