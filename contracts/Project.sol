// SPDX-License-Identifier: SELF

pragma solidity 0.8.4;

import "./Badge.sol";

contract Project {

    enum Status {
        active,
        onhold,
        failed,
        canceled,
        fulfilled
    }

    struct SpendingRequest {
        bool hasFulfilled;
        address payable recipient;
        uint256 amount;
        uint256 dateCreated;
        uint256 dateFulfilled;
        uint256 votedFor;
        uint256 votedAgainst;
        string description;
    }

    Badge badge;

    address public admin;
    Status status;
    uint256 public immutable goalAmount;
    uint256 public deadline;
    uint256 public numberOfContributors;
    uint256 public totalFundRaised;
    uint256 public immutable minContribution;
    uint256 public immutable badgeAmount;
    uint256 private srCounter;

    mapping (address => uint256) public contributors;
    mapping (address => uint256) public badgeCountByDonor;
    mapping (uint256 => SpendingRequest) public SpendingRequests;

    event RefundContributor(address indexed _recipient, address indexed _projAddress, uint256 indexed _amountRefunded);
    event PayMoney(address indexed _sender, address indexed _recipient, uint256 indexed _amountPaid);
    event UpdateProjectStatus(address indexed _requestor, address indexed _projectAddr, string msg);
    event CreateSpendingRequest(address indexed _requestor, uint256 _spendingRequestID);

    constructor(
        address _admin,
        uint256 _goalAmount, 
        uint256 _maturityInDays, 
        uint256 _minContribution,
        uint256 _badgeAmount,
        string memory _name, 
        string memory _symbol) {
            admin = _admin;
            goalAmount = _goalAmount;
            deadline = block.timestamp + _maturityInDays;
            minContribution = _minContribution;
            badgeAmount = _badgeAmount;
            status = Status.active;
            badge = new Badge(_name, _symbol);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not a valid admin");
        _;
    }

    modifier isSRReady(uint256 _requestID) {
        require(status == Status.fulfilled, "not yet fulfilled");
        require(SpendingRequests[_requestID].hasFulfilled == false, "already paid");
        _;
    }

    function contribute() public payable {
        require(status == Status.active, "not an active project");
        require(msg.value >= minContribution, "give minimum fund");
        
        if(block.timestamp >= deadline) {
            status = Status.failed;
            emit UpdateProjectStatus(msg.sender, address(this), "project failed");
            require(1 == 1, "goal not reached");
        }

        if(contributors[msg.sender] <= 0) {
            ++numberOfContributors;
        }

        contributors[msg.sender] += msg.value;
        totalFundRaised += msg.value;

        if(totalFundRaised >= goalAmount) {
            status = Status.fulfilled;
        }

        if(contributors[msg.sender] >= badgeAmount) {

            uint256 _potentialTokenCount = contributors[msg.sender] / badgeAmount;
            uint256 _actualTokenCount = _potentialTokenCount - badgeCountByDonor[msg.sender];

            for(uint256 i = 0; i < _actualTokenCount; ++i) {
                uint256 _tokenId = badge.awardBadge(msg.sender);
                badgeCountByDonor[msg.sender] += 1;
            }
            
        }

    }

    receive() external payable {
        contribute();
    }

    fallback() external {
        // do nothing
    }

    function cancelProject() public onlyAdmin {
        require(status != Status.fulfilled, "fulfilled project cannot be cancelled");
        status = Status.canceled;
        emit UpdateProjectStatus(msg.sender, address(this), "project cancelled");
    }

    function toggleProjectStatus() public onlyAdmin {
        require(status == Status.active || status == Status.onhold, "project should be in active/ onhold status");
        if(status == Status.active) {
            status = Status.onhold;
        } else if(status == Status.onhold) {
            status = Status.active;
        } else {
            // do nothing
        }

        emit UpdateProjectStatus(msg.sender, address(this), "toggled status");
    }

    function refundContributor() external returns(bool _status) {
        require(status == Status.canceled || status == Status.failed, "not ready to refund");
        if(contributors[msg.sender] > 0) {
            contributors[msg.sender] = 0;
            (_status, ) = payable(msg.sender).call{value: contributors[msg.sender]}("");

            if(_status) {
                emit RefundContributor(msg.sender, address(this), contributors[msg.sender]);
            }
        }
    }

    function createSpendingRequest(
        address payable _recipient, 
        uint256 _amount, 
        string memory _description
    ) public onlyAdmin() returns(uint256 _requestID) {
        _requestID = srCounter;
        SpendingRequest storage spendingRequest = SpendingRequests[_requestID];
        ++srCounter;
        spendingRequest.recipient = _recipient;
        spendingRequest.amount = _amount;
        spendingRequest.description = _description;
        spendingRequest.dateCreated = block.timestamp;
        spendingRequest.hasFulfilled = false;
        emit CreateSpendingRequest(msg.sender, _requestID);
        return _requestID;
    }

    function vote(uint256 _requestID, bool _opinion) public isSRReady(_requestID) {
        require(contributors[msg.sender] > 0, "not a contributor");

        if(_opinion == true) {
            ++SpendingRequests[_requestID].votedFor;
        } else {
            ++SpendingRequests[_requestID].votedAgainst;
        }
    }

    function payMoney(uint256 _requestID) public onlyAdmin() isSRReady(_requestID) {
        require(SpendingRequests[_requestID].votedFor > numberOfContributors / 2, "majority didn't agree");

        SpendingRequests[_requestID].hasFulfilled = true;
        (bool _status, ) = (SpendingRequests[_requestID].recipient).call{value: SpendingRequests[_requestID].amount}("");

        if(_status) {
            SpendingRequests[_requestID].dateFulfilled = block.timestamp;
            emit PayMoney(msg.sender, SpendingRequests[_requestID].recipient, SpendingRequests[_requestID].amount);
        }
    }

}