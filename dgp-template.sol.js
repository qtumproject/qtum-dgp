pragma solidity ^0.4.11;

contract dgp{

	struct paramsInstance{
		uint blockHeight;
		address paramsAddress;
	}

	paramsInstance[] paramsHistory;
	address[] adminKeys;
	address[] govKeys; 
	uint private maxKeys=30;
	bool private initialAdminSet=false;

	struct addressProposal{
		bool onVote;
		address[] votes;
		address proposal;
	}

	struct uintProposal{
		bool onVote;
		address[] votes;
		uint proposal;
	}

	struct proposals{
		mapping(uint=>addressProposal) keys;
		mapping(uint=>uintProposal) uints;
		mapping(uint=>addressProposal) removeKeys;
	}

	struct votesRequired{
		uint adminVotesForParams;
		uint govVotesForParams;
		uint adminVotesForManagement;
	}

	proposals currentProposals;
	votesRequired activeVotesRequired;

	modifier onlyAdmin{
		require(isAdminKey(msg.sender));
		_;
	}

	modifier onlyAdminOrGov{
		require(isAdminKey(msg.sender) || isGovKey(msg.sender));
		_;
	}

	function setInitialAdmin(){
		if(initialAdminSet)throw; // call only once
		adminKeys.push(msg.sender);
		initialAdminSet=true;
	}

	function addAddressProposal(address _proposalAddress, uint _type) onlyAdminOrGov{
		// type 0: adminKey
		// type 1: govKey
		// type 2: paramsAddress
		if(_type==0 && getArrayNonNullLenght(adminKeys)>=maxKeys) throw; // we have too many admin keys
		if(_type==1 && getArrayNonNullLenght(govKeys)>=maxKeys) throw; // we have too many gov keys
		if(_proposalAddress==0) throw; // invalid address
		if(_type>2) throw; // invalid type
		if((_type==0 || _type==1) && (isAdminKey(_proposalAddress) || isGovKey(_proposalAddress))) throw; // don't add existing keys as proposals
		if(!currentProposals.keys[_type].onVote){
			if(isGovKey(msg.sender)) throw; // Only Admin can initiate vote
			currentProposals.keys[_type].onVote=true; // put proposal on vote, no changes until vote is setteled or removed
			currentProposals.keys[_type].proposal=_proposalAddress; // set new proposal for vote
			currentProposals.keys[_type].votes.length=0; // clear votes
			currentProposals.keys[_type].votes.push(msg.sender); // add sender vote
		}else{
			if(currentProposals.keys[_type].proposal!=_proposalAddress) throw; // can only vote for current on vote address
			if(alreadyVoted(msg.sender, currentProposals.keys[_type].votes)) throw; // cannot vote twice			
			currentProposals.keys[_type].votes.push(msg.sender); // add sender vote
		}
		if(_type==0 || _type==1){
			if(tallyAdminVotes(currentProposals.keys[_type].votes)>=activeVotesRequired.adminVotesForManagement){
				if(isAdminKey(currentProposals.keys[_type].proposal) || isGovKey(currentProposals.keys[_type].proposal)) throw; // don't add existing keys
				if(_type==0)adminKeys.push(currentProposals.keys[_type].proposal); // elected
				if(_type==1)govKeys.push(currentProposals.keys[_type].proposal); // elected
				clearAddressProposal(_type);
			}
		}
		if(_type==2){
			if(tallyAdminVotes(currentProposals.keys[_type].votes)>=activeVotesRequired.adminVotesForParams && tallyGovVotes(currentProposals.keys[_type].votes)>=activeVotesRequired.govVotesForParams){
				if(paramsHistory.length>0 && paramsHistory[paramsHistory.length-1].blockHeight==block.number) throw; // don't add activate params on a height having existing params
				paramsHistory.push(paramsInstance(block.number,currentProposals.keys[_type].proposal)); // save params activation block and address				
				clearAddressProposal(_type);
			}
		}
	}

	function removeAddressProposal(address _proposalAddress, uint _type) onlyAdmin{
		// type 0: adminKey
		// type 1: govKey
		if(_proposalAddress==0) throw; // invalid address
		if(_type>1) throw; // invalid type
		if(_type==0){
		uint adminsCount=getArrayNonNullLenght(adminKeys);
		if(adminsCount==activeVotesRequired.adminVotesForParams || adminsCount==activeVotesRequired.adminVotesForManagement) throw; // cannot reduce the number of admins below the required ones
		if(!isAdminKey(_proposalAddress)) throw; // don't remove non existent address
		}
		if(_type==1){
		if(getArrayNonNullLenght(govKeys)==activeVotesRequired.govVotesForParams) throw; // cannot reduce the number of govs below the required ones
		if(!isGovKey(_proposalAddress)) throw; // don't remove non existent address
		}
		if(!currentProposals.removeKeys[_type].onVote){
			currentProposals.removeKeys[_type].onVote=true; // put proposal on vote, no changes until vote is setteled or removed
			currentProposals.removeKeys[_type].proposal=_proposalAddress; // set new proposal for vote
			currentProposals.removeKeys[_type].votes.length=0; // clear votes
			currentProposals.removeKeys[_type].votes.push(msg.sender); // add sender vote
		}else{
			if(currentProposals.removeKeys[_type].proposal!=_proposalAddress) throw; // can only vote for current on vote address
			if(alreadyVoted(msg.sender, currentProposals.removeKeys[_type].votes)) throw; // cannot vote twice			
			currentProposals.removeKeys[_type].votes.push(msg.sender); // add sender vote
		}
		if(tallyAdminVotes(currentProposals.removeKeys[_type].votes)>=activeVotesRequired.adminVotesForManagement){
			if(_type==0 && isAdminKey(currentProposals.removeKeys[_type].proposal))deleteAddress(_type, currentProposals.removeKeys[_type].proposal); // elected			
			if(_type==1 && isGovKey(currentProposals.removeKeys[_type].proposal))deleteAddress(_type, currentProposals.removeKeys[_type].proposal); // elected
			uint i;
			for(i=0;i<3;i++){
				clearAddressProposal(i); // clear any pending address votes because voters list changed
			}
			clearAddressRemovalProposal(_type);
		}
	}

	function clearAddressProposal(uint _type) private{
		currentProposals.keys[_type].proposal=0; // clear current proposal address
		currentProposals.keys[_type].votes.length=0; // clear votes
		currentProposals.keys[_type].onVote=false; // open submission
	}

	function clearAddressRemovalProposal(uint _type) private{
		currentProposals.removeKeys[_type].proposal=0; // clear current proposal address
		currentProposals.removeKeys[_type].votes.length=0; // clear votes
		currentProposals.removeKeys[_type].onVote=false; // open submission
	}

	function deleteAddress(uint _type, address _address) private{
		uint i;
		if(_type==0)
		for(i=0;i<adminKeys.length;i++){
			if(adminKeys[i]==_address)delete adminKeys[i];
		}
		if(_type==1)
		for(i=0;i<govKeys.length;i++){
			if(govKeys[i]==_address)delete govKeys[i];
		}
	}

	function changeValueProposal(uint _proposalUint, uint _type) onlyAdmin{
		// type 0: adminVotesForParams
		// type 1: govVotesForParams
		// type 2: adminVotesForManagement
		if(_type>2) throw; // invalid type
		if((_type==0 || _type==2) && _proposalUint>getArrayNonNullLenght(adminKeys)) throw; // required number cannot be greater than active admin keys count
		if(_type==1 && _proposalUint>getArrayNonNullLenght(govKeys)) throw; // required number cannot be greater than active gov keys count
		if(_type==0)if(activeVotesRequired.adminVotesForParams==_proposalUint) throw; // cannot put a proposal for the same active value
		if(_type==1)if(activeVotesRequired.govVotesForParams==_proposalUint) throw; // cannot put a proposal for the same active value
		if(_type==2)if(activeVotesRequired.adminVotesForManagement==_proposalUint) throw; // cannot put a proposal for the same active value
		if(!currentProposals.uints[_type].onVote){
			currentProposals.uints[_type].onVote=true; // put proposal on vote, no changes until vote is setteled or removed
			currentProposals.uints[_type].proposal=_proposalUint; // set new proposal for vote
			currentProposals.uints[_type].votes.length=0; // clear votes
			currentProposals.uints[_type].votes.push(msg.sender); // add sender vote
		}else{
			if(currentProposals.uints[_type].proposal!=_proposalUint) throw; // can only vote for current on vote value
			if(alreadyVoted(msg.sender, currentProposals.uints[_type].votes)) throw; // cannot vote twice			
			currentProposals.uints[_type].votes.push(msg.sender); // add sender vote
		}
		if(tallyAdminVotes(currentProposals.uints[_type].votes)>=activeVotesRequired.adminVotesForManagement){
			if(_type==0 || _type==1){
				clearAddressProposal(2); // clear any pending params address votes because of rule change
			}
			if(_type==0)activeVotesRequired.adminVotesForParams=currentProposals.uints[_type].proposal; // elected
			if(_type==2){
				clearAddressProposal(0); // clear any pending adminKey address votes because of rule change
				clearAddressProposal(1); // clear any pending govKey address votes because of rule change
			}
			if(_type==1)activeVotesRequired.govVotesForParams=currentProposals.uints[_type].proposal; // elected
			if(_type==2)activeVotesRequired.adminVotesForManagement=currentProposals.uints[_type].proposal; // elected
			clearChangeValueProposal(_type);
		}
	}

	function clearChangeValueProposal(uint _type) private{
		currentProposals.uints[_type].proposal=0; // clear current proposal address
		currentProposals.uints[_type].votes.length=0; // clear votes
		currentProposals.uints[_type].onVote=false; // open submission
	}

	function isAdminKey(address _adminAddress) constant returns (bool isAdmin){
		uint i;
		for(i=0;i<adminKeys.length;i++){
			if(adminKeys[i]==_adminAddress)return true;
		}
		return false;
	} 

	function isGovKey(address _govAddress) constant returns (bool isGov){
		uint i;
		for(i=0;i<govKeys.length;i++){
			if(govKeys[i]==_govAddress)return true;
		}
		return false;
	} 

	function alreadyVoted(address _voterAddress, address[] votes) constant returns (bool voted){
		uint i;
		for(i=0;i<votes.length;i++){
			if(votes[i]==_voterAddress)return true;
		}
		return false;
	}

	function tallyAdminVotes(address[] votes) constant returns (uint votesCount){
		uint i;
		uint count=0;
		for(i=0;i<votes.length;i++){
			if(votes[i]!=0 && isAdminKey(votes[i]))count++;
		}
		return count;
	}

	function tallyGovVotes(address[] votes) constant returns (uint votesCount){
		uint i;
		uint count=0;
		for(i=0;i<votes.length;i++){
			if(votes[i]!=0 && isGovKey(votes[i]))count++;
		}
		return count;
	}

	function getArrayNonNullLenght(address[] valsArr) constant returns (uint valsCount){
		uint i;
		uint count=0;
		for(i=0;i<valsArr.length;i++){
			if(valsArr[i]!=0)count++;
		}
		return count;
	}

	function getAddressesList(uint _type) constant returns (address[] vals){
		// type 0: adminKeys
		// type 1: govKeys
		if(_type>1) throw; // invalid type
		if(_type==0)return adminKeys;
		if(_type==1)return govKeys;
	}

	function getRequiredVotes(uint _type) constant returns (uint val){
		// type 0: adminVotesForParams
		// type 1: govVotesForParams
		// type 2: adminVotesForManagement
		if(_type>2) throw; // invalid type
		if(_type==0)return activeVotesRequired.adminVotesForParams;
		if(_type==1)return activeVotesRequired.govVotesForParams;
		if(_type==2)return activeVotesRequired.adminVotesForManagement;
	}

	function getCurrentOnVoteStatus(uint _type, uint _type2) constant returns (bool val){
		// type 0: addAddress
		// type 1: changeValue
		// type 2: removeAddress	

		// type2 0: adminKey
		// type2 1: govKey
		// type2 2: paramsAddress

		if(_type>2 || _type2>2) throw; // invalid type
		if(_type==0)return currentProposals.keys[_type2].onVote;
		if(_type==1)return currentProposals.uints[_type2].onVote;
		if(_type==2)return currentProposals.removeKeys[_type2].onVote;
	}

	function getCurrentOnVoteVotes(uint _type, uint _type2) constant returns (address[] vals){
		// type 0: addAddress
		// type 1: changeValue
		// type 2: removeAddress

		// type2 0: adminKey
		// type2 1: govKey
		// type2 2: paramsAddress

		if(_type>2 || _type2>2) throw; // invalid type
		if(_type==0)return currentProposals.keys[_type2].votes;
		if(_type==1)return currentProposals.uints[_type2].votes;
		if(_type==2)return currentProposals.removeKeys[_type2].votes;
	}

	function getCurrentOnVoteAddressProposal(uint _type, uint _type2) constant returns (address val){
		// type 0: addAddress
		// type 1: removeAddress

		// type2 0: adminKey
		// type2 1: govKey
		// type2 2: paramsAddress

		if(_type>1 || _type2>2) throw; // invalid type
		if(_type==0)return currentProposals.keys[_type2].proposal;
		if(_type==1)return currentProposals.removeKeys[_type2].proposal;
	}

	function getCurrentOnVoteValueProposal(uint _type) constant returns (uint val){
		// type 0: adminVotesForParams
		// type 1: govVotesForParams
		// type 2: adminVotesForManagement

		if(_type>2) throw; // invalid type
		return currentProposals.uints[_type].proposal;
	}

	function getParamsForBlock(uint _reqBlockHeight) constant returns (address paramsAddress){
		uint i;
		for(i=paramsHistory.length-1;i>0;i--){
			if(paramsHistory[i].blockHeight<=_reqBlockHeight)return paramsHistory[i].paramsAddress;
		}
		if(paramsHistory[0].blockHeight<=_reqBlockHeight)return paramsHistory[0].paramsAddress;
		return 0;
	}

	function getParamAddressAtIndex(uint _paramIndex) constant returns (address paramsAddress){
		return paramsHistory[_paramIndex].paramsAddress;
	}

	function getParamHeightAtIndex(uint _paramIndex) constant returns (uint paramsHeight){
		return paramsHistory[_paramIndex].blockHeight;
	}
	
	function getParamCount() constant returns (uint paramsCount){
		return paramsHistory.length;
	}
}