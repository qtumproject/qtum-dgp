pragma solidity ^0.4.8;

contract blockGasLimit{

uint32[1] _blockGasLimit=[
40000000 //default block gas limit
];
function getBlockGasLimit() constant returns(uint32[1] _gasLimit){
	return _blockGasLimit;
}

}