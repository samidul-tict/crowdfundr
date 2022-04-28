// SPDX-License-Identifier: SELF

pragma solidity 0.8.4;

import "./Project.sol";

contract CrowdFundRaise {
    Project[] public projects;

    address public immutable deployer;

    event NewProject(address indexed _creator, address indexed _projectAddr);

    constructor() {
        deployer = msg.sender;
    }

    function createProject(
        uint256 _maturityInDays,
        uint256 _goalAmount,        
        uint256 _minContribution,
        uint256 _badgeAmount,
        string memory _name,
        string memory _symbol
    ) external returns(address) {
        Project project = new Project(
            msg.sender,
            _goalAmount,
            _maturityInDays,
            _minContribution,
            _badgeAmount,
            _name,
            _symbol
        );
        projects.push(project);
        emit NewProject(msg.sender, address(project));
        return address(project);
    }
}
