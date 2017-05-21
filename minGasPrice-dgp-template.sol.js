pragma solidity ^0.4.11;

contract minGasPrice{

uint32[1] _minGasPrice=[
1 //min gas price in satoshis
];
function getMinGasPrice() constant returns(uint32[1] _gasPrice){
	return _minGasPrice;
}

}