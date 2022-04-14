// SPDX-License-Identifier: SELF

pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Badge is ERC721 {

    uint256 private tokenId;
    
    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {
        // do nothing
    }

    function awardBadge(address _donor) public returns (uint256) {
        
        ++tokenId;
        _safeMint(_donor, tokenId);
        return tokenId;
    }
}
