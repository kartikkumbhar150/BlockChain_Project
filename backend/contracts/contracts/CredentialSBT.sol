// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./interfaces/IERC5192.sol";

contract CredentialSBT is ERC721Upgradeable, UUPSUpgradeable, PausableUpgradeable, IERC5192 {

    struct CredentialData {
        string recipientName;
        string credentialType;    // "Certificate", "Degree", "License"
        string achievement;       // "AWS Solutions Architect"
        uint256 issuedAt;
        uint256 expiresAt;        // 0 = non-expiring
        string metadataURI;       // IPFS CID
        bytes32 batchId;
    }

    string public institutionName;
    string public institutionDID;
    address public platformAddress;

    mapping(uint256 => CredentialData) public credentialData;
    mapping(uint256 => bool) public revoked;
    mapping(uint256 => string) public revocationReasons;
    mapping(address => uint256[]) public recipientTokens;

    uint256 private _tokenIdCounter;

    event CredentialIssued(uint256 indexed tokenId, address indexed recipient, string credentialType, uint256 issuedAt);
    event CredentialRevoked(uint256 indexed tokenId, string reason, uint256 revokedAt);

    modifier onlyPlatform() { require(msg.sender == platformAddress, "Unauthorized"); _; }

    function initialize(string memory _name, string memory _did, address _platform) public initializer {
        __ERC721_init("CredentialSBT", "CSBT");
        __UUPSUpgradeable_init();
        __Pausable_init();
        institutionName = _name;
        institutionDID = _did;
        platformAddress = _platform;
    }

    function mint(address recipient, CredentialData calldata data) external onlyPlatform whenNotPaused returns (uint256) {
        uint256 tokenId = ++_tokenIdCounter;
        _safeMint(recipient, tokenId);
        credentialData[tokenId] = data;
        recipientTokens[recipient].push(tokenId);
        emit CredentialIssued(tokenId, recipient, data.credentialType, data.issuedAt);
        emit Locked(tokenId);
        return tokenId;
    }

    function batchMint(address[] calldata recipients, CredentialData[] calldata data)
        external onlyPlatform whenNotPaused returns (uint256[] memory) {
        require(recipients.length == data.length, "Length mismatch");
        uint256[] memory tokenIds = new uint256[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = this.mint(recipients[i], data[i]);
        }
        return tokenIds;
    }

    function revoke(uint256 tokenId, string calldata reason) external onlyPlatform {
        require(_exists(tokenId), "Token does not exist");
        revoked[tokenId] = true;
        revocationReasons[tokenId] = reason;
        emit CredentialRevoked(tokenId, reason, block.timestamp);
    }

    function isValid(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        if (revoked[tokenId]) return false;
        if (credentialData[tokenId].expiresAt != 0 &&
            block.timestamp > credentialData[tokenId].expiresAt) return false;
        return true;
    }

    // EIP-5192: always locked
    function locked(uint256) external pure override returns (bool) { return true; }

    // Block all transfers — Soulbound
    function _beforeTokenTransfer(address from, address to, uint256, uint256) internal pure override {
        require(from == address(0), "Soulbound: non-transferable");
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked("ipfs://", credentialData[tokenId].metadataURI));
    }

    function _authorizeUpgrade(address) internal override onlyPlatform {}
}
